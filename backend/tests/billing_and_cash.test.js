import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB } from './setup.js';
import { User } from '../src/models/User.js';
import { ParkingSite } from '../src/models/ParkingSite.js';
import { ParkingSlot } from '../src/models/ParkingSlot.js';
import { Booking } from '../src/models/Booking.js';
import { TokenService } from '../src/services/tokenService.js';

describe('Handler Scanner, Billing Maths & Cash Fallback Flow', () => {
  setupTestDB();

  let handler, handlerToken, site, slot;

  beforeEach(async () => {
    site = await ParkingSite.create({
      name: 'MG Road Parking Complex',
      address: 'MG Road',
      area: 'Central',
      postalCode: '560001',
      location: { type: 'Point', coordinates: [77.6, 12.97] },
      hourlyRate: 40,
      minimumCharge: 20,
      totalSlots: 5,
      isActive: true,
    });

    slot = await ParkingSlot.create({
      site: site._id,
      slotNumber: 'S-01',
      status: 'reserved',
    });

    handler = await User.create({
      name: 'Ravi Handler',
      email: 'ravi@test.com',
      phone: '9999988888',
      passwordHash: 'hash',
      role: 'handler',
      assignedSite: site._id,
    });

    handlerToken = TokenService.generateAccessToken(handler);
  });

  test('1. Entry Scan - Marks booking active and slot occupied', async () => {
    const customer = await User.create({
      name: 'Driver 1',
      email: 'd1@test.com',
      phone: '9111100001',
      passwordHash: 'hash',
      role: 'user',
      walletBalance: 200,
    });

    const booking = await Booking.create({
      user: customer._id,
      site: site._id,
      slot: slot._id,
      vehicleNumber: 'KA-01-XX-1111',
      status: 'booked',
      bookedFrom: new Date(),
      bookedUntil: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });

    const ticketQrToken = TokenService.generateQRToken({
      bookingId: booking._id.toString(),
      purpose: 'ticket',
    });

    // Handler scans ticket at entry
    const res = await request(app)
      .post('/api/v1/handler/scan')
      .set('Authorization', `Bearer ${handlerToken}`)
      .send({ qrToken: ticketQrToken });

    expect(res.status).toBe(200);
    expect(res.body.data.action).toBe('entry');

    // Verify DB states
    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking.status).toBe('active');
    expect(updatedBooking.entryTime).toBeDefined();

    const updatedSlot = await ParkingSlot.findById(slot._id);
    expect(updatedSlot.status).toBe('occupied');
  });

  test('2. Exit Billing Maths - Ceil(hours) * Rate with sufficient wallet', async () => {
    const customer = await User.create({
      name: 'Driver 2',
      email: 'd2@test.com',
      phone: '9111100002',
      passwordHash: 'hash',
      role: 'user',
      walletBalance: 200, // Sufficient for ₹120 fee
    });

    // Simulate car that entered 2.5 hours ago (Math.ceil(2.5) = 3 hrs -> 3 * 40 = ₹120)
    const twoAndHalfHoursAgo = new Date(Date.now() - 2.5 * 60 * 60 * 1000);
    const booking = await Booking.create({
      user: customer._id,
      site: site._id,
      slot: slot._id,
      vehicleNumber: 'KA-01-XX-2222',
      status: 'active',
      entryTime: twoAndHalfHoursAgo,
      bookedFrom: twoAndHalfHoursAgo,
      bookedUntil: new Date(),
    });

    const ticketQrToken = TokenService.generateQRToken({
      bookingId: booking._id.toString(),
      purpose: 'ticket',
    });

    // Handler scans ticket at exit
    const res = await request(app)
      .post('/api/v1/handler/scan')
      .set('Authorization', `Bearer ${handlerToken}`)
      .send({ qrToken: ticketQrToken });

    expect(res.status).toBe(200);
    expect(res.body.data.action).toBe('exit');
    expect(res.body.data.settled).toBe(true);
    expect(res.body.data.parkingDurationHours).toBe(3); // Math.ceil(2.5) = 3
    expect(res.body.data.totalAmount).toBe(120); // 3 hrs * ₹40/hr
    expect(res.body.data.deductedFromWallet).toBe(120);
    expect(res.body.data.customerWalletRemaining).toBe(80); // 200 - 120 = 80

    // Verify slot is released to available
    const updatedSlot = await ParkingSlot.findById(slot._id);
    expect(updatedSlot.status).toBe('available');
  });

  test('3. Insufficient balance with cash fallback and confirmation', async () => {
    const customer = await User.create({
      name: 'Driver 3',
      email: 'd3@test.com',
      phone: '9111100003',
      passwordHash: 'hash',
      role: 'user',
      walletBalance: 30, // Low balance: only ₹30
    });

    // Simulate car parked for ~1.5 hours (Math.ceil(1.5) = 2 hrs -> 2 * 40 = ₹80 total fee)
    const oneAndHalfHoursAgo = new Date(Date.now() - 1.5 * 60 * 60 * 1000);
    const booking = await Booking.create({
      user: customer._id,
      site: site._id,
      slot: slot._id,
      vehicleNumber: 'KA-01-XX-3333',
      status: 'active',
      entryTime: oneAndHalfHoursAgo,
      bookedFrom: oneAndHalfHoursAgo,
      bookedUntil: new Date(),
    });

    const ticketQrToken = TokenService.generateQRToken({
      bookingId: booking._id.toString(),
      purpose: 'ticket',
    });

    // 1. Exit scan detects insufficient balance and returns shortfall
    const exitScanRes = await request(app)
      .post('/api/v1/handler/scan')
      .set('Authorization', `Bearer ${handlerToken}`)
      .send({ qrToken: ticketQrToken });

    expect(exitScanRes.status).toBe(200);
    expect(exitScanRes.body.data.settled).toBe(false);
    expect(exitScanRes.body.data.requiresCashPayment).toBe(true);
    expect(exitScanRes.body.data.totalAmount).toBe(80);
    expect(exitScanRes.body.data.walletDeduction).toBe(30);
    expect(exitScanRes.body.data.shortfall).toBe(50); // ₹80 - ₹30 = ₹50 cash needed

    // 2. Handler records cash shortfall payment
    const confirmCashRes = await request(app)
      .post('/api/v1/handler/exit/confirm-cash')
      .set('Authorization', `Bearer ${handlerToken}`)
      .send({
        bookingId: booking._id.toString(),
        cashCollected: 50,
      });

    expect(confirmCashRes.status).toBe(200);
    expect(confirmCashRes.body.data.settled).toBe(true);
    expect(confirmCashRes.body.data.paymentMode).toBe('mixed');

    // Customer wallet should now be 0, slot released
    const updatedCustomer = await User.findById(customer._id);
    expect(updatedCustomer.walletBalance).toBe(0);

    const updatedSlot = await ParkingSlot.findById(slot._id);
    expect(updatedSlot.status).toBe('available');
  });
});

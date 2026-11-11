import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB } from './setup.js';
import { ParkingSite } from '../src/models/ParkingSite.js';
import { ParkingSlot } from '../src/models/ParkingSlot.js';

describe('Geolocation $geoNear Search & Radius Filtering Flow', () => {
  setupTestDB();

  beforeEach(async () => {
    // Ensure 2dsphere spatial index is built on test DB
    await ParkingSite.syncIndexes();

    // 1. Close site (~1.4 km from user origin)
    const nearSite = await ParkingSite.create({
      name: 'Nearby Indiranagar Hub',
      address: '100 Feet Rd',
      area: 'Indiranagar',
      postalCode: '560038',
      location: {
        type: 'Point',
        coordinates: [77.6408, 12.9784], // [lng, lat]
      },
      hourlyRate: 40,
      minimumCharge: 20,
      totalSlots: 2,
      isActive: true,
    });

    await ParkingSlot.create([
      { site: nearSite._id, slotNumber: 'N-01', status: 'available' },
      { site: nearSite._id, slotNumber: 'N-02', status: 'occupied' },
    ]);

    // 2. Far site (~25 km from user origin)
    const farSite = await ParkingSite.create({
      name: 'Far North Bangalore Hub',
      address: 'Airport Road',
      area: 'Yelahanka',
      postalCode: '560064',
      location: {
        type: 'Point',
        coordinates: [77.5946, 13.1007],
      },
      hourlyRate: 30,
      minimumCharge: 15,
      totalSlots: 2,
      isActive: true,
    });

    await ParkingSlot.create([
      { site: farSite._id, slotNumber: 'F-01', status: 'available' },
      { site: farSite._id, slotNumber: 'F-02', status: 'available' },
    ]);
  });

  test('1. 5 km Radius Filter - returns only nearby site', async () => {
    // User coordinates: Indiranagar origin (lat: 12.9716, lng: 77.6412)
    const res = await request(app)
      .get('/api/v1/parking/sites/nearby')
      .query({
        lat: 12.9716,
        lng: 77.6412,
        radius: 5,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.sites[0].name).toBe('Nearby Indiranagar Hub');
    expect(res.body.data.sites[0].distanceKm).toBeLessThan(3);
    expect(res.body.data.sites[0].freeSlotsCount).toBe(1);
  });

  test('2. 30 km Auto-Search - returns all sites sorted nearest first', async () => {
    const res = await request(app)
      .get('/api/v1/parking/sites/nearby')
      .query({
        lat: 12.9716,
        lng: 77.6412,
        radius: 30,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(2);

    // Nearest first sorting
    const sites = res.body.data.sites;
    expect(sites[0].name).toBe('Nearby Indiranagar Hub');
    expect(sites[1].name).toBe('Far North Bangalore Hub');
    expect(sites[0].distanceKm).toBeLessThan(sites[1].distanceKm);
  });
});


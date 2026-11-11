import React from 'react';
import Svg, { Path, Rect, Circle, Line, Polygon } from 'react-native-svg';

const createIcon = (children) => {
  return ({ size = 20, color = '#ffffff', strokeWidth = 2, style, ...props }) => (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      {...props}
    >
      {children}
    </Svg>
  );
};

// --- AUTH & COMMON ---
export const Mail = createIcon(
  <>
    <Rect width="20" height="16" x="2" y="4" rx="2" />
    <Path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </>
);

export const Lock = createIcon(
  <>
    <Rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>
);

export const Eye = createIcon(
  <>
    <Path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <Circle cx="12" cy="12" r="3" />
  </>
);

export const EyeOff = createIcon(
  <>
    <Path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
    <Path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
    <Path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
    <Path d="m2 2 20 20" />
  </>
);

export const XCircle = createIcon(
  <>
    <Circle cx="12" cy="12" r="10" />
    <Path d="m15 9-6 6" />
    <Path d="m9 9 6 6" />
  </>
);

export const ArrowRight = createIcon(
  <>
    <Path d="M5 12h14" />
    <Path d="m12 5 7 7-7 7" />
  </>
);

export const Crown = createIcon(
  <>
    <Path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.204a1 1 0 0 1-.965.777H5.818a1 1 0 0 1-.965-.777L2.019 6.019a.5.5 0 0 1 .798-.519l4.277 3.664a1 1 0 0 0 1.516-.294z" />
  </>
);

export const Ticket = createIcon(
  <>
    <Path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
    <Path d="M13 5v2" />
    <Path d="M13 17v2" />
    <Path d="M13 11v2" />
  </>
);

export const Car = createIcon(
  <>
    <Path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2" />
    <Circle cx="7" cy="17" r="2" />
    <Circle cx="17" cy="17" r="2" />
  </>
);

export const Check = createIcon(
  <>
    <Path d="M20 6 9 17l-5-5" />
  </>
);

export const Settings = createIcon(
  <>
    <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <Circle cx="12" cy="12" r="3" />
  </>
);

export const Server = createIcon(
  <>
    <Rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
    <Rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
    <Line x1="6" x2="6.01" y1="6" y2="6" />
    <Line x1="6" x2="6.01" y1="18" y2="18" />
  </>
);

export const X = createIcon(
  <>
    <Path d="M18 6 6 18" />
    <Path d="m6 6 12 12" />
  </>
);

export const CheckCircle2 = createIcon(
  <>
    <Circle cx="12" cy="12" r="10" />
    <Path d="m9 12 2 2 4-4" />
  </>
);

// --- NAVIGATION & ADMIN CONSOLE ICONS ---
export const BarChart3 = createIcon(
  <>
    <Path d="M3 3v18h18" />
    <Path d="M18 17V9" />
    <Path d="M13 17V5" />
    <Path d="M8 17v-3" />
  </>
);

export const MapPin = createIcon(
  <>
    <Path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <Circle cx="12" cy="10" r="3" />
  </>
);

export const ParkingSquare = createIcon(
  <>
    <Rect width="18" height="18" x="3" y="3" rx="4" />
    <Path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
  </>
);

export const Users = createIcon(
  <>
    <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <Circle cx="9" cy="7" r="4" />
    <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>
);

export const UserCheck = createIcon(
  <>
    <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <Circle cx="9" cy="7" r="4" />
    <Path d="m16 11 2 2 4-4" />
  </>
);

export const HardHat = createIcon(
  <>
    <Path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z" />
    <Path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
    <Path d="M4 15v-3a8 8 0 0 1 16 0v3" />
  </>
);

export const FileText = createIcon(
  <>
    <Path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <Path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <Path d="M10 9H8" />
    <Path d="M16 13H8" />
    <Path d="M16 17H8" />
  </>
);

export const TrendingUp = createIcon(
  <>
    <Path d="m22 7-8.5 8.5-5-5L2 17" />
    <Path d="M16 7h6v6" />
  </>
);

export const Layers = createIcon(
  <>
    <Path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <Path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    <Path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
  </>
);

export const Grid = createIcon(
  <>
    <Rect width="7" height="7" x="3" y="3" rx="1" />
    <Rect width="7" height="7" x="14" y="3" rx="1" />
    <Rect width="7" height="7" x="14" y="14" rx="1" />
    <Rect width="7" height="7" x="3" y="14" rx="1" />
  </>
);

// --- HANDLER & WALLET ICONS ---
export const Scan = createIcon(
  <>
    <Path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <Path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <Path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <Path d="M7 21H5a2 2 0 0 1-2-2v-2" />
  </>
);

export const Camera = createIcon(
  <>
    <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <Circle cx="12" cy="13" r="3" />
  </>
);

export const QrCode = createIcon(
  <>
    <Rect width="5" height="5" x="3" y="3" rx="1" />
    <Rect width="5" height="5" x="16" y="3" rx="1" />
    <Rect width="5" height="5" x="3" y="16" rx="1" />
    <Path d="M21 16h-3a2 2 0 0 0-2 2v3" />
    <Path d="M21 21v.01" />
    <Path d="M12 7v3a2 2 0 0 1-2 2H7" />
    <Path d="M3 12h.01" />
    <Path d="M12 3h.01" />
    <Path d="M12 16v.01" />
    <Path d="M16 12h1" />
    <Path d="M21 12v.01" />
    <Path d="M12 21v-1" />
  </>
);

export const Wallet = createIcon(
  <>
    <Path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <Path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </>
);

export const Banknote = createIcon(
  <>
    <Rect width="20" height="12" x="2" y="6" rx="2" />
    <Circle cx="12" cy="12" r="2" />
    <Path d="M6 12h.01M18 12h.01" />
  </>
);

export const Clock = createIcon(
  <>
    <Circle cx="12" cy="12" r="10" />
    <Path d="M12 6v6l4 2" />
  </>
);

export const Plus = createIcon(
  <>
    <Path d="M5 12h14" />
    <Path d="M12 5v14" />
  </>
);

export const Star = ({ size = 20, color = '#fbbf24', fill = 'none', strokeWidth = 2, style, ...props }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    {...props}
  >
    <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Svg>
);

export const Trash2 = createIcon(
  <>
    <Path d="M3 6h18" />
    <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <Line x1="10" x2="10" y1="11" y2="17" />
    <Line x1="14" x2="14" y1="11" y2="17" />
  </>
);

export const Edit3 = createIcon(
  <>
    <Path d="M12 20h9" />
    <Path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </>
);

export const LogOut = createIcon(
  <>
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Path d="m16 17 5-5-5-5" />
    <Line x1="21" x2="9" y1="12" y2="12" />
  </>
);

export const ChevronRight = createIcon(
  <>
    <Path d="m9 18 6-6-6-6" />
  </>
);

export const Search = createIcon(
  <>
    <Circle cx="11" cy="11" r="8" />
    <Path d="m21 21-4.3-4.3" />
  </>
);

export const AlertCircle = createIcon(
  <>
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" x2="12" y1="8" y2="12" />
    <Line x1="12" x2="12.01" y1="16" y2="16" />
  </>
);

export const Activity = createIcon(
  <>
    <Path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </>
);

export const Compass = createIcon(
  <>
    <Circle cx="12" cy="12" r="10" />
    <Polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </>
);

export const User = createIcon(
  <>
    <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </>
);

export const Phone = createIcon(
  <>
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </>
);

export const Shield = createIcon(
  <>
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </>
);

export const Navigation = createIcon(
  <>
    <Polygon points="3 11 22 2 13 21 11 13 3 11" />
  </>
);

export const Crosshair = createIcon(
  <>
    <Circle cx="12" cy="12" r="10" />
    <Line x1="22" x2="18" y1="12" y2="12" />
    <Line x1="6" x2="2" y1="12" y2="12" />
    <Line x1="12" x2="12" y1="6" y2="2" />
    <Line x1="12" x2="12" y1="22" y2="18" />
  </>
);

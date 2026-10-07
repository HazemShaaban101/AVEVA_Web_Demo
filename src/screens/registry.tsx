import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type Screen = LazyExoticComponent<ComponentType>;
const named = <K extends string>(loader: () => Promise<Record<K, ComponentType>>, key: K): Screen =>
  lazy(() => loader().then((m) => ({ default: m[key] })));

const electric = () => import('@/screens/electric/ElectricScreens');
const power = () => import('@/screens/electric/PowerScreens');
const wastewater = () => import('@/screens/wastewater/WastewaterScreens');
const metering = () => import('@/screens/metering/MeteringScreens');
const plumbing = () => import('@/screens/plumbing/PlumbingScreens');
const security = () => import('@/screens/security/SecurityScreens');
const community = () => import('@/screens/community/CommunityScreens');
const maintenance = () => import('@/screens/maintenance/MaintenanceScreens');

/** Screen for each `${system}/${subsystem}` route. */
export const SCREENS: Record<string, Screen> = {
  'fire/system': lazy(() => import('@/screens/fire/FireSystemScreen')),
  'fire/hydrants': lazy(() => import('@/screens/fire/FireHydrantsScreen').then((m) => ({ default: m.FireHydrantsScreen }))),
  'electric/transformers': named(electric, 'TransformersScreen'),
  'electric/mdb': named(electric, 'MdbScreen'),
  'electric/generators': named(power, 'GeneratorsScreen'),
  'electric/ups': named(power, 'UpsScreen'),
  'electric/sld': lazy(() => import('@/screens/electric/ElectricSldScreen').then((m) => ({ default: m.ElectricSldScreen }))),
  'metering/energy': named(metering, 'EnergyMeteringScreen'),
  'metering/analytics': named(metering, 'EnergyAnalyticsScreen'),
  'metering/water': named(metering, 'WaterMeteringScreen'),
  'metering/btu': named(metering, 'BtuScreen'),
  'metering/billing': lazy(() => import('@/screens/metering/BillingScreen').then((m) => ({ default: m.BillingScreen }))),
  'plumbing/domestic': named(plumbing, 'DomesticScreen'),
  'plumbing/pumps': named(plumbing, 'PumpsScreen'),
  'plumbing/valves': named(plumbing, 'ValveChambersScreen'),
  'plumbing/sld': lazy(() => import('@/screens/plumbing/WaterSldScreen').then((m) => ({ default: m.WaterSldScreen }))),
  'security/cctv': named(security, 'CctvScreen'),
  'security/access': named(security, 'AccessScreen'),
  'security/parking': named(security, 'ParkingScreen'),
  'security/gates': named(security, 'GatesScreen'),
  'community/application': named(community, 'ApplicationScreen'),
  'community/navigation': named(community, 'NavigationScreen'),
  'community/crowd': named(community, 'CrowdScreen'),
  'community/social': named(community, 'SocialScreen'),
  'wastewater/submersible': named(wastewater, 'SubmersiblePumpsScreen'),
  'wastewater/odor': named(wastewater, 'OdorControlScreen'),
  'maintenance/ticketing': named(maintenance, 'TicketingScreen'),
  'maintenance/mechanical': named(maintenance, 'MechanicalScreen'),
  'maintenance/electrical': named(maintenance, 'ElectricalScreen'),
  'maintenance/pumps': named(maintenance, 'MaintenancePumpsScreen'),
  'maintenance/sensors': named(maintenance, 'SensorsScreen'),
};

import { lazy } from 'react';
import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Stage } from '@/stage/Stage';
import { AuthGate } from '@/auth/AuthGate';
import { SystemLayout } from '@/app/SystemLayout';
import { SCREENS } from '@/screens/registry';
import { systemById, systemPath } from '@/model/navigation';
import { ComingSoon } from '@/screens/ComingSoon';

const CampusScreen = lazy(() => import('@/screens/site/CampusScreen'));
const BuildingScreen = lazy(() => import('@/screens/site/BuildingScreen'));
const FloorScreen = lazy(() => import('@/screens/site/FloorScreen'));
const EquipmentScreen = lazy(() => import('@/screens/site/EquipmentScreen'));
const FireBuildingScreen = lazy(() => import('@/screens/fire/FireBuildingScreen'));

export function App() {
  return (
    <Stage>
      <AuthGate>
        {/* Hash routes: any static host (GitHub Pages included) serves every screen from index.html. */}
        <HashRouter>
          <Routes>
            <Route element={<SystemLayout />}>
              <Route index element={<CampusScreen />} />
              <Route path="site/:building" element={<BuildingScreen />} />
              <Route path="site/:building/:floor" element={<FloorScreen />} />
              <Route path="site/:building/:floor/:device" element={<EquipmentScreen />} />
              <Route path="fire/system/:building" element={<FireBuildingScreen />} />
              <Route path=":system" element={<SystemIndex />} />
              <Route path=":system/:sub" element={<SubsystemScreen />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthGate>
    </Stage>
  );
}

function SystemIndex() {
  const sys = systemById(useParams().system);
  return <Navigate to={sys ? systemPath(sys) : '/'} replace />;
}

function SubsystemScreen() {
  const { system, sub } = useParams();
  const sys = systemById(system);
  if (!sys || !sys.subsystems.some((s) => s.id === sub)) return <Navigate to={sys ? systemPath(sys) : '/'} replace />;
  const Screen = SCREENS[`${system}/${sub}`];
  return Screen ? <Screen /> : <ComingSoon system={sys.label} subsystem={sys.subsystems.find((s) => s.id === sub)!.label} />;
}

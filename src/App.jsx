import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PlansProvider } from './context/PlansContext';
import Layout from './components/layout/Layout';
import CreateNewPlan from './pages/CreateNewPlan';
import PlanDetails from './pages/PlanDetails';

export default function App() {
  return (
    <BrowserRouter>
      <PlansProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<CreateNewPlan />} />

            <Route path="/plans/:id" element={<PlanDetails />} />
          </Route>
        </Routes>
      </PlansProvider>
    </BrowserRouter>
  );
}

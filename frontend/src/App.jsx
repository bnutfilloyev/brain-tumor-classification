import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Analyze from "./pages/Analyze";
import MetricsPage from "./pages/Metrics";
import Validation from "./pages/Validation";
import ModelCard from "./pages/ModelCard";
import About from "./pages/About";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientDetail />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/validation" element={<Validation />} />
        <Route path="/model-card" element={<ModelCard />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Layout>
  );
}

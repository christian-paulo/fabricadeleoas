import { Navigate } from "react-router-dom";

// Landing page preservada em /landing.
// A rota raiz "/" agora envia o lead direto para a primeira etapa do quiz.
const Index = () => <Navigate to="/onboarding/motivacao" replace />;

export default Index;

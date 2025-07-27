import RegisterForm from '@/components/RegisterForm';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function RegisterPage() {
  return (
    <ProtectedRoute requireAuth={false}>
      <RegisterForm />
    </ProtectedRoute>
  );
}

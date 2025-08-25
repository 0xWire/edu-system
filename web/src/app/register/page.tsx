import ProtectedRoute from '@/components/ProtectedRoute';
import RegisterForm from '@/components/RegisterForm';

export default function RegisterPage() {
  return (
    <ProtectedRoute requireAuth={false}>
      <RegisterForm />
    </ProtectedRoute>
  );
}

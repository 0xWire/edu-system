import ProtectedRoute from '@/components/ProtectedRoute';
import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <ProtectedRoute requireAuth={false}>
      <LoginForm />
    </ProtectedRoute>
  );
}
interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <a href="/" className="text-3xl font-bold text-blue-600">
            EduRAG
          </a>
          <p className="text-gray-600 mt-2">{title}</p>
          {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {children}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          <a href="/" className="hover:underline">
            ← Volver al inicio
          </a>
        </p>

        {footer}
      </div>
    </div>
  );
}
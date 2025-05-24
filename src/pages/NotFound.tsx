import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center">
      <div className="text-center px-4 sm:px-6 lg:px-8">
        <h1 className="text-6xl font-bold text-green-600">404</h1>
        <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">Sayfa Bulunamadı</h2>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Aradığınız sayfa bulunamadı veya taşınmış olabilir.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center rounded-md bg-green-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

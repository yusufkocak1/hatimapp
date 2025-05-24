import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthState } from '../hooks/useAuthState';

const CreateTeam = () => {
  const { user } = useAuthState();
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    setError('');

    if (!teamName.trim()) {
      setError('Takım adı gereklidir');
      return;
    }

    setLoading(true);

    try {
      const teamId = Date.now().toString();
      await setDoc(doc(db, 'teams', teamId), {
        id: teamId,
        name: teamName,
        adminId: user.uid,
        members: [user.uid],
        pendingMembers: [],
        createdAt: new Date()
      });
      await updateDoc(doc(db, 'users', user.uid), {
        teams: arrayUnion(teamId)
      });
      navigate(`/teams/${teamId}`);
    } catch (error) {
      console.error('Takım oluşturulurken hata oluştu:', error);
      setError('Takım oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Yeni Takım Oluştur
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Kendi hatim takımınızı oluşturun ve arkadaşlarınızı davet edin.
        </p>
      </div>
      <div className="mt-8 bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Takım Adı
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="teamName"
                  id="teamName"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Takım adı"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Oluşturuluyor...' : 'Takımı Oluştur'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTeam;

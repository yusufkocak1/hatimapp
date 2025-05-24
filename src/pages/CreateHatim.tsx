import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthState } from '../hooks/useAuthState';
import type {Team} from '../types';

const TOTAL_QURAN_PAGES = 604;

const CreateHatim = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuthState();
  const navigate = useNavigate();

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hatimName, setHatimName] = useState('');

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!teamId || !user) return;

      try {
        const teamDoc = await getDoc(doc(db, 'teams', teamId));

        if (!teamDoc.exists()) {
          setError('Takım bulunamadı');
          return;
        }

        const teamData = teamDoc.data() as Team;

        if (teamData.adminId !== user.uid) {
          setError('Bu işlem için yetkiniz bulunmuyor');
          return;
        }

        setTeam(teamData);
      } catch (error) {
        console.error('Takım verileri yüklenirken hata oluştu:', error);
        setError('Takım verileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [teamId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!team || !user) return;

    setError('');

    if (!hatimName.trim()) {
      setError('Hatim adı gereklidir');
      return;
    }

    if (team.members.length === 0) {
      setError('Hatim başlatmak için takımda en az bir üye olmalıdır');
      return;
    }

    setSubmitting(true);

    try {
      // Ana Hatim belgesini oluştur
      const hatimRef = await addDoc(collection(db, 'hatims'), {
        teamId,
        name: hatimName,
        startDate: new Date(),
        status: 'active',
        createdAt: new Date(),
        totalPages: TOTAL_QURAN_PAGES,
        completedPages: 0
      });

      const hatimId = hatimRef.id;

      // Batch işlemi ile tüm page assignment'ları oluştur
      const batch = writeBatch(db);
      const members = [...team.members];
      const memberCount = members.length;
      const pagesPerMember = Math.floor(TOTAL_QURAN_PAGES / memberCount);
      const remainingPages = TOTAL_QURAN_PAGES % memberCount;

      let currentPage = 1;

      // Her üye için page assignment oluştur
      members.forEach((memberId, index) => {
        const pagesToAssign = index < remainingPages
          ? pagesPerMember + 1
          : pagesPerMember;

        const pages = Array.from(
          { length: pagesToAssign },
          (_, i) => currentPage + i
        );

        // pageAssignments subcolleciton'a belge ekle
        const assignmentRef = doc(collection(db, 'hatims', hatimId, 'pageAssignments'));

        batch.set(assignmentRef, {
          userId: memberId,
          pages,
          completedPages: [],
          createdAt: new Date()
        });

        currentPage += pagesToAssign;
      });

      await batch.commit();

      navigate(`/teams/${teamId}/hatim/${hatimId}`);
    } catch (error) {
      console.error('Hatim oluşturulurken hata oluştu:', error);
      setError('Hatim oluşturulurken bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
                onClick={() => navigate(`/teams/${teamId}`)}
              >
                Takıma geri dön
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Yeni Hatim Başlat
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium">{team?.name}</span> takımı için yeni bir hatim başlatın.
          Hatim başladığında sayfalar takım üyeleri arasında otomatik olarak paylaştırılacaktır.
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
              <label htmlFor="hatimName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Hatim Adı
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="hatimName"
                  id="hatimName"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Hatim adı"
                  value={hatimName}
                  onChange={(e) => setHatimName(e.target.value)}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Örnek: Ramazan Hatmi, Şehitlerimiz İçin Hatim, vb.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Hatim Bilgileri</h4>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                <p>Toplam sayfa sayısı: {TOTAL_QURAN_PAGES}</p>
                <p>Takım üye sayısı: {team?.members.length}</p>
                <p>Kişi başı düşen sayfa sayısı: {team && Math.ceil(TOTAL_QURAN_PAGES / team.members.length)}</p>
              </div>
            </div>
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {submitting ? 'Hatim Başlatılıyor...' : 'Hatimi Başlat'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateHatim;

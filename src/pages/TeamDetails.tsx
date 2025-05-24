import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthState } from '../hooks/useAuthState';
import type { Hatim, Team, CustomUser } from "../types";

const TeamDetails = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuthState();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<CustomUser[]>([]);
  const [pendingMembers, setPendingMembers] = useState<CustomUser[]>([]);
  const [hatims, setHatims] = useState<Hatim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!teamId || !user) return;

      try {
        setLoading(true);

        // Takım bilgilerini al
        const teamDoc = await getDoc(doc(db, 'teams', teamId));

        if (!teamDoc.exists()) {
          setError('Takım bulunamadı');
          setLoading(false);
          return;
        }

        const teamData = teamDoc.data() as Team;
        setTeam(teamData);
        setIsAdmin(teamData.adminId === user.uid);

        // Takım üyelerini al
        const membersPromises = teamData.members.map(memberId =>
          getDoc(doc(db, 'users', memberId))
        );

        const memberDocs = await Promise.all(membersPromises);
        const membersData = memberDocs
          .filter(doc => doc.exists())
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as CustomUser));

        setMembers(membersData);

        // Bekleyen üyeleri al
        if (teamData.adminId === user.uid && teamData.pendingMembers?.length > 0) {
          const pendingMembersPromises = teamData.pendingMembers.map(memberId =>
            getDoc(doc(db, 'users', memberId))
          );

          const pendingMemberDocs = await Promise.all(pendingMembersPromises);
          const pendingMembersData = pendingMemberDocs
            .filter(doc => doc.exists())
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            } as CustomUser));

          setPendingMembers(pendingMembersData);
        }

        // Takım hatimlerini al
        const hatimsQuery = query(
          collection(db, 'hatims'),
          where('teamId', '==', teamId)
        );

        const hatimsSnapshot = await getDocs(hatimsQuery);
        const hatimsData = hatimsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Hatim));

        setHatims(hatimsData);
      } catch (error) {
        console.error('Takım verileri yüklenirken hata oluştu:', error);
        setError('Takım verileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [teamId, user]);

  const handleApproveMember = async (userId: string) => {
    if (!team || !isAdmin) return;

    try {
      // Takım belgesini güncelle
      await updateDoc(doc(db, 'teams', teamId!), {
        members: arrayUnion(userId),
        pendingMembers: arrayRemove(userId)
      });

      // Kullanıcı belgesini güncelle
      await updateDoc(doc(db, 'users', userId), {
        teams: arrayUnion(teamId)
      });

      // UI'ı güncelle
      const approvedUser = pendingMembers.find(member => member.id === userId);
      if (approvedUser) {
        setMembers([...members, approvedUser]);
        setPendingMembers(pendingMembers.filter(member => member.id !== userId));

        // Takım nesnesini de güncelle
        const updatedTeam = { ...team };
        updatedTeam.members = [...updatedTeam.members, userId];
        updatedTeam.pendingMembers = updatedTeam.pendingMembers.filter(id => id !== userId);
        setTeam(updatedTeam);
      }
    } catch (error) {
      console.error('Üye onaylanırken hata oluştu:', error);
      setError('Üye onaylanırken bir hata oluştu');
    }
  };

  const handleRejectMember = async (userId: string) => {
    if (!team || !isAdmin) return;

    try {
      // Takım belgesini güncelle
      await updateDoc(doc(db, 'teams', teamId!), {
        pendingMembers: arrayRemove(userId)
      });

      // UI'ı güncelle
      setPendingMembers(pendingMembers.filter(member => member.id !== userId));

      // Takım nesnesini de güncelle
      const updatedTeam = { ...team };
      updatedTeam.pendingMembers = updatedTeam.pendingMembers.filter(id => id !== userId);
      setTeam(updatedTeam);
    } catch (error) {
      console.error('Üye reddedilirken hata oluştu:', error);
      setError('Üye reddedilirken bir hata oluştu');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">Takım bulunamadı</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            {team.name}
          </h2>
          {isAdmin && (
            <div className="mt-1">
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                Takım Admini
              </span>
            </div>
          )}
        </div>
        {isAdmin && (
          <div className="mt-4 flex md:ml-4 md:mt-0">
            <Link
              to={`/teams/${teamId}/hatim/create`}
              className="ml-3 inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            >
              Yeni Hatim Başlat
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Aktif Hatimler */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Aktif Hatimler</h3>
            {hatims.length > 0 ? (
              <div className="mt-4 space-y-4">
                {hatims
                  .filter(hatim => hatim.status === 'active')
                  .map(hatim => (
                    <Link
                      key={hatim.id}
                      to={`/teams/${teamId}/hatim/${hatim.id}`}
                      className="block p-4 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{hatim.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Başlangıç: {new Date(hatim.startDate.seconds * 1000).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <div>
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            Aktif
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}

                {hatims.filter(hatim => hatim.status === 'active').length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                    Aktif hatim bulunmuyor.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                Henüz hatim oluşturulmamış.
              </p>
            )}
          </div>
        </div>

        {/* Tamamlanan Hatimler */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Tamamlanan Hatimler</h3>
            {hatims.length > 0 ? (
              <div className="mt-4 space-y-4">
                {hatims
                  .filter(hatim => hatim.status === 'completed')
                  .map(hatim => (
                    <Link
                      key={hatim.id}
                      to={`/teams/${teamId}/hatim/${hatim.id}`}
                      className="block p-4 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{hatim.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Bitiş: {hatim.endDate && new Date(hatim.startDate.seconds * 1000).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <div>
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                            Tamamlandı
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}

                {hatims.filter(hatim => hatim.status === 'completed').length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                    Tamamlanan hatim bulunmuyor.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                Henüz tamamlanan hatim bulunmuyor.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Takım Üyeleri */}
      <div className="mt-8 bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Takım Üyeleri</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {members.map(member => (
              <div key={member.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="flex-shrink-0 h-10 w-10">
                  {member.photoURL ? (
                    <img
                      className="h-10 w-10 rounded-full"
                      src={member.photoURL}
                      alt={member.displayName || "Kullanıcı"}                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-800 dark:text-green-200">
                      {member.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {member.displayName}
                  </p>
                  {member.id === team.adminId && (
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Katılma Talepleri - Sadece Admin için */}
      {isAdmin && pendingMembers.length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Bekleyen Katılma Talepleri</h3>
            <div className="mt-4 space-y-4">
              {pendingMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10">
                      {member.photoURL ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={member.photoURL}
                          alt={member.displayName || "Kullanıcı"}                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-800 dark:text-green-200">
                          {member.displayName?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.displayName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApproveMember(member.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Onayla
                    </button>
                    <button
                      onClick={() => handleRejectMember(member.id)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDetails;

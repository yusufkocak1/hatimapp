import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuthState} from '../hooks/useAuthState';
import {doc, getDoc} from 'firebase/firestore';
import {db, functions} from '../firebase/config';
import {httpsCallable} from "firebase/functions";

interface Team {
    id: string;
    name: string;
    adminId: string;
    members: string[];
    pendingMembers: string[];
    createdAt: any;
}

const Dashboard = () => {
    const {user} = useAuthState();
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [joinTeamId, setJoinTeamId] = useState('');
    const [joinError, setJoinError] = useState('');
    const [joinSuccess, setJoinSuccess] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [selectedTeamForInvite, setSelectedTeamForInvite] = useState('');
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState('');
    const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null);

    useEffect(() => {
        const fetchTeams = async () => {
            if (!user) return;

            try {
                setLoading(true);

                const userDoc = await getDoc(doc(db, 'users', user.uid));
                const userData = userDoc.data();

                if (userData?.teams && userData.teams.length > 0) {
                    const teamsPromises = userData.teams.map((teamId: string) => getDoc(doc(db, 'teams', teamId)));

                    const teamDocs = await Promise.all(teamsPromises);

                    const teamsData = teamDocs.map(doc => {
                        const data = doc.data() || {};
                        return {
                            id: doc.id,
                            ...data,
                            members: Array.isArray(data.members) ? data.members : [],
                            pendingMembers: Array.isArray(data.pendingMembers) ? data.pendingMembers : []
                        } as Team;
                    }).filter(team => team.id);
                    setTeams(teamsData);
                } else {
                    setTeams([]);
                }
            } catch (error) {
                console.error('Takımlar yüklenirken hata oluştu:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTeams();
    }, [user]);

    const handleJoinTeam = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;

        setJoinError('');
        setJoinSuccess('');

        if (!joinTeamId.trim()) {
            setJoinError('Takım IDsi gereklidir');
            return;
        }

        try {
            const teamDoc = await getDoc(doc(db, 'teams', joinTeamId));
            if (!teamDoc.exists()) {
                setJoinError('Takım bulunamadı');
                return;
            }

            const teamData = teamDoc.data() as Team;

            if (teamData.members.includes(user.uid)) {
                setJoinError('Zaten bu takımın üyesisiniz');
                return;
            }

            if (teamData.pendingMembers && teamData.pendingMembers.includes(user.uid)) {
                setJoinError('Takıma katılma isteği zaten gönderilmiş');
                return;
            }

            const joinTeamFunction = httpsCallable(functions, 'joinTeamRequest');
            await joinTeamFunction({teamId: joinTeamId, userId: user.uid});

            setJoinSuccess('Takıma katılma isteği başarıyla gönderildi. Admin onayı bekleniyor.');
            setJoinTeamId('');
        } catch (error: any) {
            console.error('Takıma katılırken hata oluştu:', error);
            setJoinError(error.message || 'Takıma katılırken bir hata oluştu');
        }
    };

    const handleInviteToTeam = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;

        setInviteError('');
        setInviteSuccess('');

        if (!selectedTeamForInvite) {
            setInviteError('Lütfen bir takım seçin');
            return;
        }

        if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
            setInviteError('Geçerli bir e-posta adresi girin');
            return;
        }

        try {
            // Admin yetkisi kontrolü
            const selectedTeam = teams.find(team => team.id === selectedTeamForInvite);
            if (!selectedTeam || selectedTeam.adminId !== user.uid) {
                setInviteError('Bu takım için davet gönderme yetkiniz yok');
                return;
            }

            const inviteFunction = httpsCallable(functions, 'inviteToTeam');
            await inviteFunction({
                teamId: selectedTeamForInvite,
                email: inviteEmail.trim(),
                invitedBy: user.displayName || user.email
            });

            setInviteSuccess(`${inviteEmail} adresine davet gönderildi`);
            setInviteEmail('');
        } catch (error: any) {
            console.error('Davet gönderilirken hata oluştu:', error);
            setInviteError(error.message || 'Davet gönderilirken bir hata oluştu');
        }
    };

    const copyTeamId = (e: React.MouseEvent, teamId: string) => {
        e.preventDefault(); // Link'in tetiklenmesini engelle
        e.stopPropagation(); // Event'in üst öğelere yayılmasını engelle

        navigator.clipboard.writeText(teamId)
            .then(() => {
                setCopiedTeamId(teamId);
                // 2 saniye sonra kopyalama mesajını kaldır
                setTimeout(() => setCopiedTeamId(null), 2000);
            })
            .catch(err => {
                console.error('Panoya kopyalama başarısız oldu:', err);
            });
    };

    return (<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="md:flex md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
                    Takımlarım
                </h2>
            </div>
            <div className="mt-4 flex md:ml-4 md:mt-0">
                <Link
                    to="/teams/create"
                    className="ml-3 inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                >
                    Yeni Takım Oluştur
                </Link>
            </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? (<div className="col-span-full flex justify-center py-12">
                <div
                    className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>) : teams.length > 0 ? (teams.map((team) => (<Link
                key={team.id}
                to={`/teams/${team.id}`}
                className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition duration-300 hover:shadow-md relative"
            >
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{team.name}</h3>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <p>Üye sayısı: {team.members?.length || 0}</p>
                    </div>
                    <div className="mt-3 flex justify-between items-center">
                        {team.adminId === user?.uid && (<div>
                        <span
                            className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          Admin
                        </span>
                        </div>)}
                        <button
                            onClick={(e) => copyTeamId(e, team.id)}
                            className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            title="Takım ID'sini kopyala"
                        >
                            {copiedTeamId === team.id ? "Kopyalandı!" : "ID Kopyala"}
                        </button>
                    </div>
                </div>
            </Link>))) : (<div className="col-span-full bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        Henüz bir takıma üye değilsiniz. Yeni bir takım oluşturun veya mevcut bir takıma
                        katılın.
                    </p>
                </div>
            </div>)}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Takıma Katıl</h3>
                <div className="mt-4 bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        {joinSuccess && (<div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
                            <div className="flex">
                                <div className="ml-3">
                                    <p className="text-sm text-green-700">{joinSuccess}</p>
                                </div>
                            </div>
                        </div>)}

                        {joinError && (<div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                            <div className="flex">
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{joinError}</p>
                                </div>
                            </div>
                        </div>)}

                        <form onSubmit={handleJoinTeam} className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-grow">
                                    <label htmlFor="teamId"
                                        className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Takım ID
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="text"
                                            name="teamId"
                                            id="teamId"
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            placeholder="takım-id"
                                            value={joinTeamId}
                                            onChange={(e) => setJoinTeamId(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="submit"
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        Katıl
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Katılmak istediğiniz takımın ID'sini girin. Takım yöneticisi isteğinizi onayladıktan
                                sonra takıma katılmış olacaksınız.
                            </p>
                        </form>
                    </div>
                </div>
            </div>

            {teams.filter(team => team.adminId === user?.uid).length > 0 && (
                <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Takıma Davet Et</h3>
                    <div className="mt-4 bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            {inviteSuccess && (<div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <p className="text-sm text-green-700">{inviteSuccess}</p>
                                    </div>
                                </div>
                            </div>)}

                            {inviteError && (<div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700">{inviteError}</p>
                                    </div>
                                </div>
                            </div>)}

                            <form onSubmit={handleInviteToTeam} className="space-y-4">
                                <div>
                                    <label htmlFor="teamSelect"
                                        className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Takım Seçin
                                    </label>
                                    <div className="mt-1">
                                        <select
                                            id="teamSelect"
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            value={selectedTeamForInvite}
                                            onChange={(e) => setSelectedTeamForInvite(e.target.value)}
                                        >
                                            <option value="">Takım seçin</option>
                                            {teams
                                                .filter(team => team.adminId === user?.uid)
                                                .map(team => (
                                                    <option key={team.id} value={team.id}>{team.name}</option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-grow">
                                        <label htmlFor="inviteEmail"
                                            className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            E-posta Adresi
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                type="email"
                                                name="inviteEmail"
                                                id="inviteEmail"
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                placeholder="ornek@email.com"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            type="submit"
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                        >
                                            Davet Et
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Kullanıcıyı e-posta ile takıma davet edin. Davet gönderildiğinde, kullanıcı
                                    takıma katılmak için bir bağlantı içeren e-posta alacaktır.
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>);
};

export default Dashboard;

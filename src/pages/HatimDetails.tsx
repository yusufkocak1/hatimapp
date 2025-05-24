import {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {arrayRemove, arrayUnion, doc, getDoc, updateDoc, Timestamp, collection, query, getDocs} from 'firebase/firestore';
import {db} from '../firebase/config';
import {useAuthState} from '../hooks/useAuthState';
import type {Hatim, PageAssignment, Team} from '../types';

const HatimDetails = () => {
    const {teamId, hatimId} = useParams<{ teamId: string; hatimId: string }>();
    const {user} = useAuthState();
    const navigate = useNavigate();

    const [hatim, setHatim] = useState<Hatim | null>(null);
    const [team, setTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [userAssignment, setUserAssignment] = useState<PageAssignment & { id: string } | null>(null);
    const [allAssignments, setAllAssignments] = useState<(PageAssignment & { id: string })[]>([]);
    const [completionPercentage, setCompletionPercentage] = useState(0);

    useEffect(() => {
        const fetchHatimData = async () => {
            if (!teamId || !hatimId || !user) return;

            try {
                setLoading(true);

                // Hatim bilgilerini al
                const hatimDoc = await getDoc(doc(db, 'hatims', hatimId));

                if (!hatimDoc.exists()) {
                    setError('Hatim bulunamadı');
                    setLoading(false);
                    return;
                }

                const hatimData = {...hatimDoc.data(), id: hatimId} as Hatim;
                setHatim(hatimData);

                // Takım bilgilerini al
                const teamDoc = await getDoc(doc(db, 'teams', teamId));

                if (!teamDoc.exists()) {
                    setError('Takım bulunamadı');
                    setLoading(false);
                    return;
                }

                const teamData = {...teamDoc.data(), id: teamId} as Team;
                setTeam(teamData);
                setIsAdmin(teamData.adminId === user.uid);

                // Tüm page assignment'ları al
                const assignmentsQuery = query(collection(db, 'hatims', hatimId, 'pageAssignments'));
                const assignmentsSnapshot = await getDocs(assignmentsQuery);

                if (assignmentsSnapshot.empty) {
                    console.log("Sayfa ataması bulunamadı");
                }

                const assignments = assignmentsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as (PageAssignment & { id: string })[];

                setAllAssignments(assignments);

                // Kullanıcının atamasını bul
                const userAssignment = assignments.find(a =>
                    a.userId === user.uid || a.userId === user.email
                );

                if (!userAssignment) {
                    console.log("Kullanıcı için atama bulunamadı. uid:", user.uid);
                }

                setUserAssignment(userAssignment || null);

                // İlerleme yüzdesini hesapla
                if (assignments.length > 0) {
                    const totalPages = assignments.reduce((acc, curr) => acc + curr.pages.length, 0);
                    const completedPages = assignments.reduce((acc, curr) => acc + (curr.completedPages?.length || 0), 0);
                    setCompletionPercentage(Math.round((completedPages / totalPages) * 100));
                }
            } catch (error) {
                console.error('Hatim verileri yüklenirken hata oluştu:', error);
                setError('Hatim verileri yüklenirken bir hata oluştu');
            } finally {
                setLoading(false);
            }
        };

        fetchHatimData();
    }, [teamId, hatimId, user]);

    const formatFirebaseDate = (date: any) => {
        if (!date) return "-";

        try {
            if (typeof date === 'object' && 'seconds' in date) {
                return new Date(date.seconds * 1000).toLocaleDateString('tr-TR');
            }
            return new Date(date).toLocaleDateString('tr-TR');
        } catch (e) {
            console.error("Tarih dönüştürme hatası:", e);
            return "-";
        }
    };

    const handleMarkPage = async (pageNumber: number, isCompleted: boolean) => {
        if (!hatim || !user || !userAssignment) return;

        try {
            // Doğrudan kullanıcının atama belgesini güncelle
            const assignmentRef = doc(db, 'hatims', hatimId!, 'pageAssignments', userAssignment.id);

            if (isCompleted) {
                await updateDoc(assignmentRef, {
                    completedPages: arrayUnion(pageNumber)
                });
            } else {
                await updateDoc(assignmentRef, {
                    completedPages: arrayRemove(pageNumber)
                });
            }

            // Güncellenmiş atamayı getir
            const updatedAssignmentDoc = await getDoc(assignmentRef);

            if (!updatedAssignmentDoc.exists()) {
                console.error("Güncellenmiş atama belgesi bulunamadı");
                return;
            }

            // State'i güncelle
            const updatedAssignment = {
                id: userAssignment.id,
                ...updatedAssignmentDoc.data()
            } as PageAssignment & { id: string };

            setUserAssignment(updatedAssignment);

            // Tüm atamaları güncelle
            const newAssignments = allAssignments.map(assignment =>
                assignment.id === userAssignment.id ? updatedAssignment : assignment
            );

            setAllAssignments(newAssignments);

            // Tamamlanma oranını hesapla
            const totalPages = newAssignments.reduce((acc, curr) => acc + curr.pages.length, 0);
            const completedPages = newAssignments.reduce((acc, curr) => acc + (curr.completedPages?.length || 0), 0);

            const newCompletionPercentage = Math.round((completedPages / totalPages) * 100);
            setCompletionPercentage(newCompletionPercentage);

            // Hatim tamamlandı mı kontrol et
            if (completedPages === totalPages && totalPages > 0) {
                const hatimRef = doc(db, 'hatims', hatimId!);
                await updateDoc(hatimRef, {
                    status: 'completed',
                    endDate: new Date(),
                    completedPages: completedPages
                });

                // Hatim state'ini güncelle
                if (hatim) {
                    setHatim({
                        ...hatim,
                        status: 'completed',
                        endDate: Timestamp.now(),
                        completedPages: completedPages
                    });
                }
            } else {
                // Sadece tamamlanan sayfa sayısını güncelle
                const hatimRef = doc(db, 'hatims', hatimId!);
                await updateDoc(hatimRef, {
                    completedPages: completedPages
                });

                if (hatim) {
                    setHatim({
                        ...hatim,
                        completedPages: completedPages
                    });
                }
            }
        } catch (error) {
            console.error('Sayfa işaretlenirken hata oluştu:', error);
        }
    };

    const handleCompleteHatim = async () => {
        if (!hatim || !isAdmin) return;

        try {
            await updateDoc(doc(db, 'hatims', hatimId!), {
                status: 'completed',
                endDate: Timestamp.now()
            });

            setHatim({...hatim, status: 'completed', endDate: Timestamp.now()});
        } catch (error) {
            console.error('Hatim tamamlanırken hata oluştu:', error);
        }
    };

    if (loading) {
        return (<div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>);
    }

    if (error) {
        return (<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
        </div>);
    }

    if (!hatim) {
        return (<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                    <div className="ml-3">
                        <p className="text-sm text-yellow-700">Hatim bulunamadı</p>
                    </div>
                </div>
            </div>
        </div>);
    }

    return (<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div>
            <div className="md:flex md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
                        {hatim.name}
                    </h2>
                    <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span className="mr-1.5 flex-shrink-0 text-gray-400">
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd"
                          d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
                          clipRule="evenodd"/>
                  </svg>
                </span>
                            Başlangıç: {formatFirebaseDate(hatim.startDate)}
                            {hatim.endDate && (<>
                                <span className="mx-2">•</span>
                                Bitiş: {formatFirebaseDate(hatim.endDate)}
                            </>)}
                        </div>
                        <div className="mt-2 flex items-center text-sm">
                <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${hatim.status === 'active' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'}`}>
                  {hatim.status === 'active' ? 'Aktif' : 'Tamamlandı'}
                </span>
                        </div>
                    </div>
                </div>

                {isAdmin && hatim.status === 'active' && (<div className="mt-4 flex md:ml-4 md:mt-0">
                    <button
                        onClick={handleCompleteHatim}
                        className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                    >
                        Hatimi Tamamla
                    </button>
                </div>)}
            </div>

            <div className="mt-6">
                <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                    Hatim İlerlemesi: %{completionPercentage}
                </h3>
                <div className="mt-2 h-4 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                        className="h-4 rounded-full bg-green-600"
                        style={{width: `${completionPercentage}%`}}
                    ></div>
                </div>
            </div>
        </div>

        {hatim.status === 'completed' ? (
            <div className="mt-8 bg-green-50 dark:bg-green-900 border-l-4 border-green-400 p-4">
                <div className="flex">
                    <div className="ml-3">
                        <p className="text-sm text-green-700 dark:text-green-200">
                            Bu hatim tamamlanmıştır. Allah kabul etsin.
                        </p>
                    </div>
                </div>
            </div>) : !userAssignment && (
            <div className="mt-8 bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                    <div className="ml-3">
                        <p className="text-sm text-yellow-700 dark:text-yellow-200">
                            Bu hatimde size atanmış sayfa bulunmamaktadır. Hatim başladıktan sonra takıma dahil
                            olduğunuz için, bir sonraki hatimde size sayfa atanacaktır.
                        </p>
                    </div>
                </div>
            </div>)}

        {userAssignment && (<div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Okumanız Gereken Sayfalar
            </h3>
            <div className="mt-4 bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Size atanan sayfalar aşağıda listelenmiştir. Okuduğunuz sayfaları işaretleyebilirsiniz.
                    </p>

                    <div
                        className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {userAssignment.pages.map(page => {
                            const isCompleted = userAssignment.completedPages?.includes(page) || false;
                            return (<button
                                key={page}
                                onClick={() => handleMarkPage(page, !isCompleted)}
                                className={`h-12 flex items-center justify-center rounded-md border text-sm font-medium ${isCompleted ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-800 dark:text-green-100 dark:border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'}`}
                            >
                                {page}
                                {isCompleted && (<svg className="ml-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg"
                                                      viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd"
                                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 01-1.05-.143z"
                                          clipRule="evenodd"/>
                                </svg>)}
                            </button>);
                        })}
                    </div>
                </div>
            </div>
        </div>)}

        <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Tüm Sayfa Atamaları
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {allAssignments.map(assignment => {
                    const memberName = team?.members.includes(assignment.userId)
                        ? (assignment.userId === user?.uid ? 'Siz' : assignment.userId)
                        : 'Bilinmeyen Üye';
                    const completedPageCount = assignment.completedPages?.length || 0;
                    const totalPageCount = assignment.pages?.length || 0;
                    const progress = totalPageCount > 0 ? Math.round((completedPageCount / totalPageCount) * 100) : 0;

                    return (
                        <div key={assignment.id}
                             className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                        {memberName}
                                    </h4>
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {completedPageCount}/{totalPageCount} sayfa
                                    </span>
                                </div>
                                <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                                    <div
                                        className="h-2 rounded-full bg-green-600"
                                        style={{width: `${progress}%`}}
                                    ></div>
                                </div>
                                <div className="mt-3">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Atanan sayfalar: {assignment.pages[0]} - {assignment.pages[assignment.pages.length - 1]}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>);
};

export default HatimDetails;

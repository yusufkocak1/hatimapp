import {functions} from './config.ts';
import {httpsCallable} from 'firebase/functions';

export const sendJoinTeamRequest = async (teamId: string, userId: string) => {
    try {
        const joinTeamFunction = httpsCallable(functions, 'joinTeamRequest');
        return await joinTeamFunction({teamId, userId});
    } catch (error) {
        console.error('Takıma katılma isteği gönderilirken hata oluştu:', error);
        throw error;
    }
};

export const approveJoinRequest = async (teamId: string, userId: string) => {
    try {
        const approveRequestFunction = httpsCallable(functions, 'approveTeamRequest');
        return await approveRequestFunction({teamId, userId});
    } catch (error) {
        console.error('Takıma katılma isteği onaylanırken hata oluştu:', error);
        throw error;
    }
};

export const rejectJoinRequest = async (teamId: string, userId: string) => {
    try {
        const rejectRequestFunction = httpsCallable(functions, 'rejectTeamRequest');
        return await rejectRequestFunction({teamId, userId});
    } catch (error) {
        console.error('Katılma isteği reddedilirken hata oluştu:', error);
        throw error;
    }
};

export const checkHatimCompletion = async (hatimId: string) => {
    try {
        const checkCompletionFunction = httpsCallable(functions, 'checkHatimCompletion');
        return await checkCompletionFunction({hatimId});
    } catch (error) {
        console.error('Hatim tamamlanma kontrolü yapılırken hata oluştu:', error);
        throw error;
    }
};

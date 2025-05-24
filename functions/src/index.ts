import { onCall } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

initializeApp();

const db = getFirestore();

export const joinTeamRequest = onCall({
  maxInstances: 10,
  timeoutSeconds: 60,
}, async (request) => {
  try {
    const { teamId, userId } = request.data;

    if (!teamId || !userId) {
      throw new Error("Takım ID'si ve kullanıcı ID'si gereklidir");
    }

    const teamRef = db.collection("teams").doc(teamId);
    const teamDoc = await teamRef.get();

    if (!teamDoc.exists) {
      throw new Error("Takım bulunamadı");
    }

    const teamData = teamDoc.data();

    if (teamData?.members && teamData.members.includes(userId)) {
      throw new Error("Zaten bu takımın üyesisiniz");
    }

    if (teamData?.pendingMembers && teamData.pendingMembers.includes(userId)) {
      throw new Error("Zaten katılma isteği gönderilmiş");
    }

    await teamRef.update({
      pendingMembers: FieldValue.arrayUnion(userId),
    });

    return { success: true, message: "Katılma isteği gönderildi" };
  } catch (error) {
    logger.error("joinTeamRequest fonksiyonunda hata:", error);
    throw new Error(error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu");
  }
});

export const approveTeamRequest = onCall({
  maxInstances: 10,
  timeoutSeconds: 60,
}, async (request) => {
  try {
    const { teamId, userId } = request.data;
    const callerUserId = request.auth?.uid;

    if (!teamId || !userId || !callerUserId) {
      throw new Error("Eksik parametreler");
    }

    const teamRef = db.collection("teams").doc(teamId);
    const teamDoc = await teamRef.get();

    if (!teamDoc.exists) {
      throw new Error("Takım bulunamadı");
    }

    const teamData = teamDoc.data();

    if (teamData?.adminId !== callerUserId) {
      throw new Error("Bu işlem için yetkiniz yok");
    }

    if (!teamData?.pendingMembers || !teamData.pendingMembers.includes(userId)) {
      throw new Error("Kullanıcının katılma isteği bulunamadı");
    }

    const batch = db.batch();

    batch.update(teamRef, {
      pendingMembers: FieldValue.arrayRemove(userId),
      members: FieldValue.arrayUnion(userId),
    });

    const userRef = db.collection("users").doc(userId);
    batch.update(userRef, {
      teams: FieldValue.arrayUnion(teamId),
    });

    await batch.commit();

    return { success: true, message: "Kullanıcı takıma eklendi" };
  } catch (error) {
    logger.error("approveTeamRequest fonksiyonunda hata:", error);
    throw new Error(error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu");
  }
});

export const rejectTeamRequest = onCall({
  maxInstances: 10,
  timeoutSeconds: 60,
}, async (request) => {
  try {
    const { teamId, userId } = request.data;
    const callerUserId = request.auth?.uid;

    if (!teamId || !userId || !callerUserId) {
      throw new Error("Eksik parametreler");
    }

    const teamRef = db.collection("teams").doc(teamId);
    const teamDoc = await teamRef.get();

    if (!teamDoc.exists) {
      throw new Error("Takım bulunamadı");
    }

    const teamData = teamDoc.data();

    if (teamData?.adminId !== callerUserId) {
      throw new Error("Bu işlem için yetkiniz yok");
    }

    if (!teamData?.pendingMembers || !teamData.pendingMembers.includes(userId)) {
      throw new Error("Kullanıcının katılma isteği bulunamadı");
    }

    await teamRef.update({
      pendingMembers: FieldValue.arrayRemove(userId),
    });

    return { success: true, message: "Katılma isteği reddedildi" };
  } catch (error) {
    logger.error("rejectTeamRequest fonksiyonunda hata:", error);
    throw new Error(error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu");
  }
});

export const checkHatimCompletion = onCall({
  maxInstances: 10,
  timeoutSeconds: 60,
}, async (request) => {
  try {
    const { hatimId } = request.data;

    if (!hatimId) {
      throw new Error("Hatim ID'si gereklidir");
    }

    const hatimRef = db.collection("hatims").doc(hatimId);
    const hatimDoc = await hatimRef.get();

    if (!hatimDoc.exists) {
      throw new Error("Hatim bulunamadı");
    }

    const hatimData = hatimDoc.data();

    if (!hatimData) {
      throw new Error("Hatim verisi alınamadı");
    }

    if (hatimData.status === "completed") {
      return {
        completed: true,
        message: "Hatim tamamlandı",
      };
    }

    const pageAssignments = hatimData.pageAssignments || [];
    let totalPages = 0;
    let completedPages = 0;

    for (const assignment of pageAssignments) {
      if (assignment.pages) {
        totalPages += assignment.pages.length;
      }
      if (assignment.completedPages) {
        completedPages += assignment.completedPages.length;
      }
    }

    const isCompleted = totalPages > 0 && completedPages >= totalPages;

    if (isCompleted) {
      await hatimRef.update({
        status: "completed",
        endDate: new Date(),
      });

      return {
        completed: true,
        message: "Hatim tamamlandı",
        progress: 100,
        totalPages,
        completedPages,
      };
    }

    return {
      completed: false,
      message: "Hatim devam ediyor",
      progress: completedPages / totalPages * 100,
      totalPages,
      completedPages
    };
  } catch (error) {
    logger.error("checkHatimCompletion fonksiyonunda hata:", error);
    throw new Error(error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu");
  }
});

export const hatimPageCompletionTrigger = onDocumentUpdated("hatims/{hatimId}", async (event) => {
  try {
    if (!event.data) {
      logger.error('Event data is undefined');
      return;
    }

    const afterData = event.data.after.data() || {};
    const beforeData = event.data.before.data() || {};

    if (afterData.status === "completed" || beforeData.status === "completed") {
      return;
    }

    const pageAssignments = afterData.pageAssignments || [];
    let totalPages = 0;
    let completedPages = 0;

    for (const assignment of pageAssignments) {
      if (assignment.pages) {
        totalPages += assignment.pages.length;
      }
      if (assignment.completedPages) {
        completedPages += assignment.completedPages.length;
      }
    }

    const isCompleted = totalPages > 0 && completedPages >= totalPages;

    if (isCompleted) {
      const hatimId = event.data.after.id;
      await db.collection("hatims").doc(hatimId).update({
        status: "completed",
        endDate: new Date(),
      });

      logger.info(`Hatim ${hatimId} otomatik olarak tamamlandı`);
    }
  } catch (error) {
    logger.error("hatimPageCompletionTrigger fonksiyonunda hata:", error);
  }
});


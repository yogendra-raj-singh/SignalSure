import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  BLUEPRINT_LIMITS,
  buildIncidentReportPayload,
  buildScanReportPayload,
  buildUserProfileFields,
  type SavedIncidentItem,
  type SavedScanItem,
} from './firestoreSchemas';
import type { AnalysisReport, IncidentReportInput } from './types';

function toMillis(ts: unknown): number {
  if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof (ts as { toMillis: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

export async function syncUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);

  try {
    const fields = buildUserProfileFields({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    });

    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        ...fields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName: fields.displayName,
        email: fields.email,
        photoUrl: fields.photoUrl,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveScanReport(params: {
  userId: string;
  rawInput: string;
  report: AnalysisReport;
  notes?: string;
}): Promise<string> {
  const path = 'scanReports';

  try {
    const payload = buildScanReportPayload({
      ownerId: params.userId,
      rawInput: params.rawInput,
      report: params.report,
      notes: params.notes,
    });
    const docRef = await addDoc(collection(db, path), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeScanReports(
  userId: string,
  onData: (items: SavedScanItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'scanReports';
  const q = query(
    collection(db, path),
    where('ownerId', '==', userId),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: SavedScanItem[] = snapshot.docs
        .map((snap) => {
          const d = snap.data();
          return {
            id: snap.id,
            ownerId: String(d.ownerId || ''),
            inputKind: (d.inputKind === 'url' ? 'url' : 'message') as 'url' | 'message',
            inputPreview: String(d.inputPreview || ''),
            mode: (d.mode === 'live' ? 'live' : 'demo') as 'live' | 'demo',
            riskLevel: (
              d.riskLevel === 'Critical' ||
              d.riskLevel === 'High' ||
              d.riskLevel === 'Medium' ||
              d.riskLevel === 'Low'
                ? d.riskLevel
                : 'Medium'
            ) as SavedScanItem['riskLevel'],
            category: String(d.category || ''),
            summary: String(d.summary || ''),
            researchSummary: String(d.researchSummary || ''),
            evidenceCount: typeof d.evidenceCount === 'number' ? d.evidenceCount : 0,
            notes: String(d.notes || ''),
            status: (d.status === 'resolved' ? 'resolved' : 'active') as 'active' | 'resolved',
            createdAtMs: toMillis(d.createdAt),
          };
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (structuredErr) {
        if (onError) {
          onError(structuredErr instanceof Error ? structuredErr : new Error(String(structuredErr)));
        } else {
          throw structuredErr;
        }
      }
    }
  );
}

export async function updateScanReportRecord(params: {
  reportId: string;
  notes: string;
  status: 'active' | 'resolved';
}): Promise<void> {
  const path = `scanReports/${params.reportId}`;
  try {
    if (!BLUEPRINT_LIMITS.ID_PATTERN.test(params.reportId)) {
      throw new Error('Invalid scan report ID.');
    }
    await updateDoc(doc(db, 'scanReports', params.reportId), {
      notes: params.notes.trim().slice(0, BLUEPRINT_LIMITS.NOTES_MAX),
      status: params.status === 'resolved' ? 'resolved' : 'active',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteScanReportRecord(reportId: string): Promise<void> {
  const path = `scanReports/${reportId}`;
  try {
    if (!BLUEPRINT_LIMITS.ID_PATTERN.test(reportId)) {
      throw new Error('Invalid scan report ID.');
    }
    await deleteDoc(doc(db, 'scanReports', reportId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveIncidentReportRecord(params: {
  userId: string;
  referenceId: string;
  input: IncidentReportInput;
  submissionMode: 'live' | 'demo';
}): Promise<string> {
  const path = 'incidentReports';

  try {
    const payload = buildIncidentReportPayload({
      ownerId: params.userId,
      referenceId: params.referenceId,
      input: params.input,
      submissionMode: params.submissionMode,
    });
    const docRef = await addDoc(collection(db, path), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeIncidentReports(
  userId: string,
  onData: (items: SavedIncidentItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'incidentReports';
  const q = query(
    collection(db, path),
    where('ownerId', '==', userId),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: SavedIncidentItem[] = snapshot.docs
        .map((snap) => {
          const d = snap.data();
          return {
            id: snap.id,
            ownerId: String(d.ownerId || ''),
            referenceId: String(d.referenceId || ''),
            scamType: String(d.scamType || ''),
            channel: String(d.channel || ''),
            approximateDate: String(d.approximateDate || ''),
            description: String(d.description || ''),
            contactEmail: String(d.contactEmail || ''),
            submissionMode: (d.submissionMode === 'live' ? 'live' : 'demo') as 'live' | 'demo',
            status: (d.status === 'archived' ? 'archived' : 'submitted') as 'submitted' | 'archived',
            createdAtMs: toMillis(d.createdAt),
          };
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (structuredErr) {
        if (onError) {
          onError(structuredErr instanceof Error ? structuredErr : new Error(String(structuredErr)));
        } else {
          throw structuredErr;
        }
      }
    }
  );
}

export async function archiveIncidentReportRecord(incidentId: string): Promise<void> {
  const path = `incidentReports/${incidentId}`;
  try {
    if (!BLUEPRINT_LIMITS.ID_PATTERN.test(incidentId)) {
      throw new Error('Invalid incident report ID.');
    }
    await updateDoc(doc(db, 'incidentReports', incidentId), {
      status: 'archived',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteIncidentReportRecord(incidentId: string): Promise<void> {
  const path = `incidentReports/${incidentId}`;
  try {
    if (!BLUEPRINT_LIMITS.ID_PATTERN.test(incidentId)) {
      throw new Error('Invalid incident report ID.');
    }
    await deleteDoc(doc(db, 'incidentReports', incidentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

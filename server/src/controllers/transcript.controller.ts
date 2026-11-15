import { Request, Response } from 'express';
import transcriptService from '../services/transcript.service.js';

function sendTranscriptError(res: Response, error: any, defaultMsg: string): void {
  const statusCode =
    error.statusCode ||
    (error.message?.includes('ፈቃድ የለዎትም')
      ? 403
      : error.message?.includes('አልተገኘም')
      ? 404
      : error.message?.includes('ንቁ ረቂቅ')
      ? 409
      : 400);

  const errorCode =
    error.code ||
    (statusCode === 403
      ? 'FORBIDDEN'
      : statusCode === 404
      ? 'NOT_FOUND'
      : statusCode === 409
      ? 'CONFLICT'
      : statusCode >= 500
      ? 'INTERNAL_SERVER_ERROR'
      : 'BAD_REQUEST');

  res.status(statusCode).json({
    success: false,
    message: error.message || defaultMsg,
    code: errorCode,
  });
}

export class TranscriptController {
  async getOfficialTranscript(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const requestingUserId = req.user!.id;
      const requestingUserRole = req.user!.role;

      const transcript = await transcriptService.getOfficialTranscript(
        studentId,
        requestingUserId,
        requestingUserRole
      );

      res.status(200).json({
        success: true,
        data: transcript,
      });
    } catch (error: any) {
      sendTranscriptError(res, error, 'ይፋዊ የትምህርት ማስረጃውን ማውጣት አልተቻለም።');
    }
  }

  async getTranscriptDraft(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const requestingUserId = req.user!.id;
      const requestingUserRole = req.user!.role;

      const draft = await transcriptService.getTranscriptDraft(
        studentId,
        requestingUserId,
        requestingUserRole
      );

      res.status(200).json({
        success: true,
        data: draft,
      });
    } catch (error: any) {
      sendTranscriptError(res, error, 'ረቂቅ የትምህርት ማስረጃውን ማውጣት አልተቻለም።');
    }
  }

  async getTranscriptVersion(req: Request, res: Response): Promise<void> {
    try {
      const { studentId, versionNumber } = req.params;
      const requestingUserId = req.user!.id;
      const requestingUserRole = req.user!.role;

      const parsedVersion = parseInt(versionNumber, 10);
      if (isNaN(parsedVersion) || parsedVersion < 1) {
        res.status(400).json({
          success: false,
          message: 'ትክክለኛ የቅጽ ቁጥር (Version number) መገለጽ አለበት።',
          code: 'INVALID_VERSION_NUMBER',
        });
        return;
      }

      const versionDoc = await transcriptService.getTranscriptVersion(
        studentId,
        parsedVersion,
        requestingUserId,
        requestingUserRole
      );

      res.status(200).json({
        success: true,
        data: versionDoc,
      });
    } catch (error: any) {
      sendTranscriptError(res, error, 'የቀደመ የትምህርት ማስረጃ ቅጽ ማውጣት አልተቻለም።');
    }
  }

  async prepareOfficialTranscript(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const adminUserId = req.user!.id;
      const { notes } = req.body;

      const transcript = await transcriptService.prepareOfficialTranscript(
        studentId,
        adminUserId,
        notes
      );

      res.status(200).json({
        success: true,
        message: 'ይፋዊ የትምህርት ማስረጃ ረቂቅ በተሳካ ሁኔታ ተዘጋጅቶ ለግምገማ ቀርቧል።',
        data: transcript,
      });
    } catch (error: any) {
      sendTranscriptError(res, error, 'ይፋዊ የትምህርት ማስረጃውን ማዘጋጀት አልተቻለም።');
    }
  }

  async publishOfficialTranscript(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const adminUserId = req.user!.id;
      const { notes } = req.body;

      const transcript = await transcriptService.publishOfficialTranscript(
        studentId,
        adminUserId,
        notes
      );

      res.status(200).json({
        success: true,
        message: 'ይፋዊ የትምህርት ማስረጃው በይፋ ጸድቆ ታትሟል።',
        data: transcript,
      });
    } catch (error: any) {
      sendTranscriptError(res, error, 'ይፋዊ የትምህርት ማስረጃውን ይፋ ማድረግ አልተቻለም።');
    }
  }

  async discardTranscriptDraft(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const adminUserId = req.user!.id;
      const { reason } = req.body || {};

      const transcript = await transcriptService.discardTranscriptDraft(
        studentId,
        adminUserId,
        reason
      );

      res.status(200).json({
        success: true,
        message: 'ረቂቅ የትምህርት ማስረጃው በተሳካ ሁኔታ ተሰርዟል።',
        data: transcript,
      });
    } catch (error: any) {
      sendTranscriptError(res, error, 'ረቂቁን መሰረዝ አልተቻለም።');
    }
  }

  async getPublicationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const requestingUserRole = req.user!.role;

      const history = await transcriptService.getPublicationHistory(
        studentId,
        requestingUserRole
      );

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      sendTranscriptError(res, error, 'የማስረጃውን ታሪክ ማውጣት አልተቻለም።');
    }
  }
}

export const transcriptController = new TranscriptController();
export default transcriptController;

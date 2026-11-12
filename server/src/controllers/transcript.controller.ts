import { Request, Response } from 'express';
import transcriptService from '../services/transcript.service.js';

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
      const statusCode = error.message.includes('ፈቃድ የለዎትም')
        ? 403
        : error.message.includes('አልተገኘም')
        ? 404
        : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'ይፋዊ የትምህርት ማስረጃውን ማውጣት አልተቻለም።',
      });
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
      const statusCode = error.message.includes('ፈቃድ የለዎትም')
        ? 403
        : error.message.includes('አልተገኘም')
        ? 404
        : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'ረቂቅ የትምህርት ማስረጃውን ማውጣት አልተቻለም።',
      });
    }
  }

  async getTranscriptVersion(req: Request, res: Response): Promise<void> {
    try {
      const { studentId, versionNumber } = req.params;
      const requestingUserId = req.user!.id;
      const requestingUserRole = req.user!.role;

      const parsedVersion = parseInt(versionNumber, 10);
      if (isNaN(parsedVersion) || parsedVersion <= 0) {
        res.status(400).json({
          success: false,
          message: 'ትክክለኛ የቅጽ ቁጥር (Version number) ያስገቡ።',
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
      const statusCode = error.message.includes('ፈቃድ የለዎትም')
        ? 403
        : error.message.includes('አልተገኘም')
        ? 404
        : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'የቀደመ የትምህርት ማስረጃ ቅጽ ማውጣት አልተቻለም።',
      });
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
      const statusCode = error.statusCode
        ? error.statusCode
        : error.message?.includes('ፈቃድ የለዎትም')
        ? 403
        : error.message?.includes('አልተገኘም')
        ? 404
        : error.message?.includes('ንቁ ረቂቅ')
        ? 409
        : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'ይፋዊ የትምህርት ማስረጃውን ማዘጋጀት አልተቻለም።',
      });
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
      const statusCode = error.statusCode
        ? error.statusCode
        : error.message?.includes('ፈቃድ የለዎትም')
        ? 403
        : error.message?.includes('አልተገኘም')
        ? 404
        : error.message?.includes('ንቁ ረቂቅ') || error.message?.includes('ረቂቅ')
        ? 409
        : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'ይፋዊ የትምህርት ማስረጃውን ማጽደቅ አልተቻለም።',
      });
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
      const statusCode = error.statusCode
        ? error.statusCode
        : error.message?.includes('ፈቃድ የለዎትም')
        ? 403
        : error.message?.includes('አልተገኘም') || error.message?.includes('የለም')
        ? 400
        : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'ረቂቁን መሰረዝ አልተቻለም።',
      });
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
      const statusCode = error.message.includes('ፈቃድ የለዎትም') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'የማስረጃውን ታሪክ ማውጣት አልተቻለም።',
      });
    }
  }
}

export const transcriptController = new TranscriptController();
export default transcriptController;

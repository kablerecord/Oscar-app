/**
 * OSQR Document Indexing - Detection Module
 */

export {
  onDocumentEvent,
  emitDocumentEvent,
  createDocumentCreatedEvent,
  createDocumentModifiedEvent,
  createDocumentDeletedEvent,
  detectDocumentType,
  isSupported,
  getCodeLanguage,
} from './event-handler';

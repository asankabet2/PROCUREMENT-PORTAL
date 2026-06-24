import axios from 'axios';


const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:5001/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;

      const isPublic = ['/', '/supplier/register', '/supplier/login', '/admin/login',
        '/supplier/forgot-password', '/admin/forgot-password', '/forgot-password', '/reset-password']
        .some(p => path === p || path.startsWith(p));

      if (!isPublic) {
        localStorage.removeItem('token');
        const isAdmin = path.startsWith('/admin');
        window.location.href = isAdmin ? '/admin/login' : '/supplier/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============ AUTH ============
export const supplierLogin = (email, password) => api.post('/auth/supplier/login', { email, password });
export const adminLogin    = (email, password) => api.post('/auth/admin/login',    { email, password });

export const getPublicStats = () => axios.get(`${API_BASE_URL}/stats`);

// ============ TENDERS ============
export const getTenders     = ()         => api.get('/tenders');
export const getTenderById  = (id)       => api.get(`/tenders/${id}`);
export const createTender   = (data)     => api.post('/tenders', data);
export const updateTender   = (id, data) => api.put(`/tenders/${id}`, data);
export const deleteTender   = (id)       => api.delete(`/tenders/${id}`);

// ============ TENDER INTERESTS ============
export const getTenderInterests = (tenderId)              => api.get(`/tenders/${tenderId}/interests`);
export const expressInterest    = (tenderId, supplierId)  => api.post(`/tenders/${tenderId}/interest`, { supplierId });

// ============ SUPPLIERS ============
export const getSuppliers         = ()         => api.get('/suppliers');
export const getSupplierById      = (id)       => api.get(`/suppliers/${id}`);
export const updateSupplier       = (id, data) => api.put(`/suppliers/${id}`, data);
export const updateSupplierStatus = (id, data) => api.patch(`/suppliers/${id}/status`, data);

// ============ SUPPLIER REGISTRATION ============
export const generateRegistrationNumber = () => api.get('/suppliers/generate-registration-number');
export const registerSupplier = (data)       => api.post('/suppliers/register', data);

export const uploadSupplierDocuments = (supplierId, formData, uploadToken) =>
  api.post(`/suppliers/${supplierId}/upload-documents`, formData, {
    headers: {
      'Content-Type': null,
      Authorization: `Bearer ${uploadToken}`,
    },
  });

export const uploadSupplierExperiences = (supplierId, formData, uploadToken) =>
  api.post(`/suppliers/${supplierId}/upload-experiences`, formData, {
    headers: {
      'Content-Type': null,
      Authorization: `Bearer ${uploadToken}`,
    },
  });

// ============ SUPPLIER DOCUMENTS ============
export const getSupplierDocuments = (supplierId) => api.get(`/suppliers/${supplierId}/documents`);

export const renewDocument = (supplierId, docType, formData) =>
  api.post(`/suppliers/${supplierId}/documents/${docType}/renew`, formData, {
    headers: { 'Content-Type': null },
  });
  
// Get single bid by ID with its items
export const getBidById = (bidId) => api.get(`/bids/${bidId}`);

export const verifyDocument = (supplierId, docType, data) =>
  api.patch(`/suppliers/${supplierId}/documents/${docType}/verify`, data);

// ============ SUPPLIER EXPERIENCE DOCUMENTS ============
export const getSupplierExperienceDocuments = (supplierId) =>
  api.get(`/suppliers/${supplierId}/experience-documents`);

export const verifyExperience = (supplierId, index, data) =>
  api.patch(`/suppliers/${supplierId}/experiences/${index}/verify`, data);

// ============ DOCUMENT VIEWING ============
export const getDocumentUrl = (supplierId, fileName) => {
  const cleanFileName = fileName.includes('/') ? fileName.split('/').pop() : fileName;
  return `${API_BASE_URL}/suppliers/${supplierId}/documents/${cleanFileName}`;
};

export const getDocumentSignedUrl = (fileName) =>
  api.get('/suppliers/documents/signed-url', { params: { fileName } });

export const fetchDocument = async (supplierId, fileName) => {
  const cleanFileName = fileName.includes('/') ? fileName.split('/').pop() : fileName;
  const url = getDocumentUrl(supplierId, cleanFileName);
  const response = await axios.get(url, {
    responseType: 'blob',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

// ============ SUPPLIER EXPERIENCES ============
export const getSupplierExperiences = (supplierId) => api.get(`/suppliers/${supplierId}/experiences`);
export const getSupplierInterests   = (supplierId) => api.get(`/suppliers/${supplierId}/interests`);

// ============ BIDS ============
export const getAllBids        = ()           => api.get('/bids');
export const getBidsByTender   = (tenderId)   => api.get(`/bids/tender/${tenderId}`);
export const getBidsBySupplier = (supplierId) => api.get(`/bids/supplier/${supplierId}`);
export const submitBid         = (data)       => api.post('/bids', data);
export const updateBidStatus   = (id, data)   => api.patch(`/bids/${id}/status`, data);

// ============ TENDER ITEM AWARDS ============
export const getTenderItemAwards = (tenderId, itemNo) => api.get(`/tenders/${tenderId}/items/${itemNo}/awards`);
export const awardTenderItem = (tenderId, itemNo, data) => api.post(`/tenders/${tenderId}/items/${itemNo}/award`, data);
export const splitAwardTenderItem = (tenderId, itemNo, data) => api.post(`/tenders/${tenderId}/items/${itemNo}/split-award`, data);
export const getAllTenderAwards = (tenderId) => api.get(`/tenders/${tenderId}/awards`);

export const downloadBidReceipt = async (bidId) => {
  const response = await api.get(`/bids/${bidId}/download`, {
    responseType: 'blob',
  });

  if (response.data.type === 'application/json') {
    const text = await response.data.text();
    const err = JSON.parse(text);
    throw new Error(err.message || 'Download failed');
  }

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Bid_${bidId}_Receipt.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ============ CRITERIA LIBRARY (global, managed on Settings) ============
export const getCriteriaLibrary    = ()         => api.get('/criteria-library');
export const createLibraryCriteria = (data)     => api.post('/criteria-library', data);
export const updateLibraryCriteria = (id, data) => api.put(`/criteria-library/${id}`, data);
export const deleteLibraryCriteria = (id)       => api.delete(`/criteria-library/${id}`);

// ============ EVALUATION CRITERIA (per-tender) ============
export const getTenderCriteria = (tenderId)             => api.get(`/tenders/${tenderId}/criteria`);
export const addCriteria       = (tenderId, data)       => api.post(`/tenders/${tenderId}/criteria`, data); // { criteria: [{ criteriaRefId }] }
export const updateCriteria    = (tenderId, id, data)   => api.put(`/tenders/${tenderId}/criteria/${id}`, data); // { maxScore, weight }
export const deleteCriteria    = (tenderId, id)         => api.delete(`/tenders/${tenderId}/criteria/${id}`);

// ============ PANEL MEMBER DIRECTORY (global, managed on Settings) ============
export const getPanelDirectory     = ()         => api.get('/panel-members');
export const createDirectoryMember = (data)     => api.post('/panel-members', data);
export const updateDirectoryMember = (id, data) => api.put(`/panel-members/${id}`, data);
export const deleteDirectoryMember = (id)       => api.delete(`/panel-members/${id}`);

// ============ EVALUATION PANEL (per-tender) ============
export const getTenderPanel    = (tenderId)             => api.get(`/tenders/${tenderId}/panel`);
export const addPanelMembers   = (tenderId, data)       => api.post(`/tenders/${tenderId}/panel`, data); // { members: [{ directoryMemberId, role, status }] }
export const updatePanelMember = (tenderId, id, data)   => api.put(`/tenders/${tenderId}/panel/${id}`, data);
export const removePanelMember = (tenderId, id)         => api.delete(`/tenders/${tenderId}/panel/${id}`);

// ============ PRELIMINARY EVALUATION ============
export const getPreliminaryEvaluation  = (tenderId)       => api.get(`/tenders/${tenderId}/preliminary`);
export const savePreliminaryEvaluation = (tenderId, data) => api.put(`/tenders/${tenderId}/preliminary`, data);

// ============ TECHNICAL EVALUATION ============
export const getTechnicalEvaluation  = (tenderId)       => api.get(`/tenders/${tenderId}/technical`);
export const saveTechnicalEvaluation = (tenderId, data) => api.put(`/tenders/${tenderId}/technical`, data);

// ============ RESPONSIVENESS (derived) ============
export const getResponsiveness   = (tenderId) => api.get(`/tenders/${tenderId}/responsiveness`);
export const getEvaluationStatus = (tenderId) => api.get(`/tenders/${tenderId}/evaluation-status`);

// ============ CATEGORIES ============
export const getCategories        = ()     => api.get('/categories');
export const getAllCategories      = ()     => api.get('/categories/all');
export const createTenderCategory = (data) => api.post('/categories', data);
export const deactivateCategory   = (id)   => api.delete(`/categories/${id}`);
export const restoreCategory      = (id)   => api.post(`/categories/${id}/restore`);

// ============ NOTIFICATIONS ============
export const getNotifications      = (userId) => api.get(`/notifications/${userId}`);
export const markNotificationRead  = (id)     => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = ()    => api.patch('/notifications/read-all');

// ============ ADMIN ============
export const getAdminUsers   = ()     => api.get('/admin/users');
export const createAdminUser = (data) => api.post('/admin/users', data);
export const deleteAdminUser = (id)   => api.delete(`/admin/users/${id}`);

// ============ EMAIL TEMPLATES ============
export const getEmailTemplates    = ()                   => api.get('/email-templates');
export const updateEmailTemplate  = (templateId, data)  => api.put(`/email-templates/${templateId}`, data);
export const getEmailTemplateTypes = ()                       => api.get('/email-templates/types');
export const createEmailTemplate   = (data)                   => api.post('/email-templates', data);

// ============ ADMIN UTILITIES ============
export const updateTenderStatuses   = () => api.get('/admin/update-tender-statuses');
export const checkClosingTenders    = () => api.get('/admin/check-closing-tenders');
export const checkExpiringDocuments = () => api.get('/admin/check-expiring-documents');

// ============ SETTINGS / AUDIT ============
export const getDefaultDocuments = () => api.get('/default-documents');
export const getAuditLog         = () => api.get('/audit');

// ============ PASSWORD MANAGEMENT ============
export const changePassword = (data)               => api.post('/auth/change-password', data);
export const forgotPassword = (email)              => api.post('/auth/forgot-password', { email });
export const resetPassword  = (token, newPassword) => api.post('/auth/reset-password', { token, newPassword });

// ============ REFERENCE DATA ============
export const getCompanyTypes           = ()         => api.get('/company-types');
export const getRegions                = ()         => api.get('/regions');
export const getRegionCities           = (regionId) => api.get(`/regions/${regionId}/cities`);
export const getCities                 = ()         => api.get('/cities');
export const getCountries              = ()         => api.get('/countries');
export const getRegistrationCategories = ()         => api.get('/registration/categories');

export default api;
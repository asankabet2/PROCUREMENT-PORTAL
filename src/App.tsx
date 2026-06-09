import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider} from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import ToastContainer from "@/components/ToastContainer";

import LandingPage from "@/pages/LandingPage";
import AdminLogin from "@/pages/auth/AdminLogin";
import SupplierLogin from "@/pages/auth/SupplierLogin";
import SupplierRegister from "@/pages/auth/SupplierRegister";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import TenderManagement from "@/pages/admin/TenderManagement";
import TenderDetail from "@/pages/admin/TenderDetail";
import BidBreakdown from "@/pages/admin/BidBreakdown";
import EditTender from '@/pages/admin/EditTender';
import SupplierManagement from "@/pages/admin/SupplierManagement";
import SupplierDetail from "@/pages/admin/SupplierDetail";
import Reports from "@/pages/admin/Reports";
import UserManagement from "@/pages/admin/UserManagement";
import AdminNotifications from '@/pages/admin/AdminNotifications';
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminDocumentVerification from '@/pages/admin/AdminDocumentVerification';
import AdminSupplierDocuments from '@/pages/admin/AdminSupplierDocuments';

import SupplierDashboard from "@/pages/supplier/SupplierDashboard";
import BrowseTenders from "@/pages/supplier/BrowseTenders";
import SupplierTenderDetail from "@/pages/supplier/SupplierTenderDetails";
import BidSubmission from "@/pages/supplier/BidSubmission";
import MyBids from "@/pages/supplier/MyBids";
import SupplierBidDetails from '@/pages/supplier/SupplierBidDetails';
import SupplierProfile from "@/pages/supplier/SupplierProfile";
import SupplierDocuments from "@/pages/supplier/SupplierDocuments";
import SupplierNotifications from "@/pages/supplier/SupplierNotifications";

import ProtectedRoute from "@/components/ProtectedRoute";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Gives AuthProvider access to useNavigate without a page reload */}
        {/* <NavigateSetter /> */}
        <NotificationProvider>
          <TooltipProvider>
            <ToastContainer />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/supplier/login" element={<SupplierLogin />} />
              <Route path="/supplier/register" element={<SupplierRegister />} />

              {/* Forgot Password Routes */}
              <Route path="/supplier/forgot-password" element={<ForgotPassword role="supplier" />} />
              <Route path="/forgot-password" element={<ForgotPassword role="supplier" />} />
              <Route path="/admin/forgot-password" element={<ForgotPassword role="admin" />} />

              {/* Reset Password Route */}
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Admin Portal */}
              <Route path="/admin/dashboard" element={
                <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="/admin/tenders/edit/:id" element={
                <ProtectedRoute role="admin"><EditTender /></ProtectedRoute>
              } />
              <Route path="/admin/tenders/:id/bids/:bidId" element={
                <ProtectedRoute role="admin"><BidBreakdown /></ProtectedRoute>
              } />
              <Route path="/admin/tenders/:id" element={
                <ProtectedRoute role="admin"><TenderDetail /></ProtectedRoute>
              } />
              <Route path="/admin/tenders" element={
                <ProtectedRoute role="admin"><TenderManagement /></ProtectedRoute>
              } />
              <Route path="/admin/suppliers/:supplierId/documents" element={
                <ProtectedRoute role="admin"><AdminSupplierDocuments /></ProtectedRoute>
              } />
              <Route path="/admin/suppliers/:id" element={
                <ProtectedRoute role="admin"><SupplierDetail /></ProtectedRoute>
              } />
              <Route path="/admin/suppliers" element={
                <ProtectedRoute role="admin"><SupplierManagement /></ProtectedRoute>
              } />
              <Route path="/admin/reports" element={
                <ProtectedRoute role="admin"><Reports /></ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute role="admin"><UserManagement /></ProtectedRoute>
              } />
              <Route path="/admin/notifications" element={
                <ProtectedRoute role="admin"><AdminNotifications /></ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>
              } />
              <Route path="/admin/documents/verify" element={
                <ProtectedRoute role="admin"><AdminDocumentVerification /></ProtectedRoute>
              } />

              {/* Supplier Portal */}
              <Route path="/supplier/dashboard" element={
                <ProtectedRoute role="supplier"><SupplierDashboard /></ProtectedRoute>
              } />
              <Route path="/supplier/tenders/:id/bid" element={
                <ProtectedRoute role="supplier"><BidSubmission /></ProtectedRoute>
              } />
              <Route path="/supplier/tenders/:id" element={
                <ProtectedRoute role="supplier"><SupplierTenderDetail /></ProtectedRoute>
              } />
              <Route path="/supplier/tenders" element={
                <ProtectedRoute role="supplier"><BrowseTenders /></ProtectedRoute>
              } />
              <Route path="/supplier/bids" element={
                <ProtectedRoute role="supplier"><MyBids /></ProtectedRoute>
              } />
              <Route path="/supplier/bids/:bidId" element={
                <ProtectedRoute role="supplier"><SupplierBidDetails /></ProtectedRoute>
              } />
              <Route path="/supplier/profile" element={
                <ProtectedRoute role="supplier"><SupplierProfile /></ProtectedRoute>
              } />
              <Route path="/supplier/documents" element={
                <ProtectedRoute role="supplier"><SupplierDocuments /></ProtectedRoute>
              } />
              <Route path="/supplier/notifications" element={
                <ProtectedRoute role="supplier"><SupplierNotifications /></ProtectedRoute>
              } />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
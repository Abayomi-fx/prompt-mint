import { lazy, Suspense } from "react";
import { Outlet, Route, Routes } from "react-router-dom";
import { CartProvider } from "./providers/CartProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Home from "./pages/Home";

const BrowsePage = lazy(() => import("./pages/browse/page.jsx"));
const SellPage = lazy(() => import("./pages/sell/page.tsx"));
const ChatHome = lazy(() => import("./pages/chat/page.tsx"));
const ProfilePage = lazy(() => import("./pages/profile/page.tsx"));
const PromptDetailPage = lazy(() => import("./pages/prompt/page.tsx"));
const CreatorSharePage = lazy(() => import("./pages/creator/page.tsx"));
const StatusPage = lazy(() => import("./pages/status/page.tsx"));
const ModerationPage = lazy(() => import("./pages/Moderation.tsx"));
const ApiKeysPage = lazy(() => import("./pages/settings/ApiKeys.tsx"));

const AppLayout = () => (
  <main className="min-h-screen bg-slate-950 text-white pb-16 sm:pb-0">
    <Outlet />
  </main>
);

function App() {
  return (
    <CartProvider>
      <ErrorBoundary routeName="Application">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
              <div className="text-white text-lg">Loading...</div>
            </div>
          }
        >
          <Routes>
            <Route element={<AppLayout />}>
              <Route
                path="/"
                element={
                  <ErrorBoundary routeName="Home">
                    <Home />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/browse"
                element={
                  <ErrorBoundary routeName="Browse">
                    <BrowsePage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/prompt/:id"
                element={
                  <ErrorBoundary routeName="Prompt Detail">
                    <PromptDetailPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/creator/:address"
                element={
                  <ErrorBoundary routeName="Creator">
                    <CreatorSharePage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/sell"
                element={
                  <ErrorBoundary routeName="Sell">
                    <SellPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/chat"
                element={
                  <ErrorBoundary routeName="Chat">
                    <ChatHome />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/profile"
                element={
                  <ErrorBoundary routeName="Profile">
                    <ProfilePage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/status"
                element={
                  <ErrorBoundary routeName="Status">
                    <StatusPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/settings/api-keys"
                element={
                  <ErrorBoundary routeName="API Keys">
                    <ApiKeysPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/moderation"
                element={
                  <ErrorBoundary routeName="Moderation">
                    <ModerationPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="*"
                element={
                  <ErrorBoundary routeName="Not Found">
                    <Home />
                  </ErrorBoundary>
                }
              />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </CartProvider>
  );
}

export default App;

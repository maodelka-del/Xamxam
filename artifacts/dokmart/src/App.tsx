import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { Navbar } from "@/components/Navbar";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import DocumentDetail from "@/pages/DocumentDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import OrderTracking from "@/pages/OrderTracking";
import Admin from "@/pages/Admin";
import AdminOrderDetail from "@/pages/AdminOrderDetail";
import Levels from "@/pages/Levels";
import PDFViewer from "@/pages/PDFViewer";
import DocumentReader from "@/pages/DocumentReader";
import BecomeSeller from "@/pages/BecomeSeller";
import SellerLogin from "@/pages/SellerLogin";
import SellerDashboard from "@/pages/SellerDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
    },
  },
});

const ADMIN_ROUTES = ["/admin", "/admin/orders/"];

function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/admin/orders/:id" component={AdminOrderDetail} />
      <Route path="/admin" component={Admin} />
      <Route path="/seller/login" component={SellerLogin} />
      <Route path="/seller/dashboard" component={SellerDashboard} />
      <Route>
        {() => (
          <>
            <Navbar />
            <Switch>
              <Route path="/" component={Catalog} />
              <Route path="/home" component={Home} />
              <Route path="/catalog" component={Catalog} />
              <Route path="/documents/:id/read" component={DocumentReader} />
              <Route path="/documents/:id" component={DocumentDetail} />
              <Route path="/cart" component={Cart} />
              <Route path="/checkout" component={Checkout} />
              <Route path="/levels" component={Levels} />
              <Route path="/become-seller" component={BecomeSeller} />
              <Route path="/order/:orderId/view/:fileId" component={PDFViewer} />
              <Route path="/order/:id" component={OrderTracking} />
              <Route component={NotFound} />
            </Switch>
          </>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

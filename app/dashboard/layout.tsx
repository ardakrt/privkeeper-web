import ModalManager from "@/components/ModalManager";
import OTPPreloader from "@/components/OTPPreloader";
import DataPreloader from "@/components/DataPreloader";
import LoanAutoSyncProvider from "@/components/LoanAutoSyncProvider";
import FloatingSidebar from "@/components/ui/floating-sidebar";
import MobileSidebar from "@/components/ui/mobile-sidebar";
import TopHeader from "@/components/ui/top-header";
import { fetchAllUserData } from "@/app/actions/preload";
import StoreInitializer from "@/components/StoreInitializer";
import PinGuard from "@/components/PinGuard";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const allData = await fetchAllUserData();

  return (
    <PinGuard user={allData.user}>
      <div className="h-[100dvh] w-full relative bg-white dark:bg-black overflow-hidden">
        <StoreInitializer data={allData} />

        {/* Cosmic Noise Background - Dark Mode */}
        <div
          className="absolute inset-0 z-0 dark:block hidden"
          style={{
            background: "radial-gradient(150% 150% at 50% 100%, #000000 40%, #299690ff 100%)"
          }}
        />

        {/* Light Mode Background */}
        <div
          className="absolute inset-0 z-0 dark:hidden block"
          style={{
            background: "radial-gradient(500% 125% at 50% 90%, #ffffff 40%, #33c4b3ff 100%)"
          }}
        />

        {/* Content Layer */}
        <div className="relative z-10 flex h-full w-full overflow-hidden">
          {/* Background Preloaders */}
          <OTPPreloader />
          <DataPreloader />
          <LoanAutoSyncProvider />

          {/* Modal Manager */}
          <ModalManager />

          {/* Mobile Sidebar (Drawer) */}
          <MobileSidebar />

          {/* Collapsible Sidebar - Left (Desktop) */}
          <FloatingSidebar />

          {/* Main Content Area - Responsive to sidebar width */}
          <div className="flex-1 flex flex-col transition-all duration-500 ease-in-out pl-0 md:pl-[130px] pr-0 md:pr-40">
            {/* Top Header */}
            <TopHeader />

            {/* Page Content */}
            <main className="flex-1 w-full relative overflow-hidden">
              <div className="h-full w-full">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </PinGuard>
  );
}
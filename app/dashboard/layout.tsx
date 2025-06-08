import DashboardClientLayout from './dashboard-client-layout';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  // The root layout now handles session checking with middleware.
  // This component just passes children to the client layout.
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
} 
 
 
"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

NProgress.configure({ showSpinner: false });

export default function TopProgressBar() {
  const pathname = usePathname();

  useEffect(() => {
    NProgress.start();
    NProgress.set(0.4);
    const timeout = setTimeout(() => NProgress.done(), 600);
    return () => {
      NProgress.done();
      clearTimeout(timeout);
    };
  }, [pathname]);

  return null;
} 
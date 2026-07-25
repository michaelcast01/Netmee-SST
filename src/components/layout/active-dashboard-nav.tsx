"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavLink } from "./dashboard-nav";

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

function NavItem({ link, pathname, onNavigate }: { link: NavLink; pathname: string; onNavigate?: () => void }) {
  const active = isActive(pathname, link.href);
  return (
    <Link aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined} href={link.href} onClick={onNavigate}>
      {link.label}
    </Link>
  );
}

export function ActiveDashboardNav({ links, mobile = false }: { links: NavLink[]; mobile?: boolean }) {
  const pathname = usePathname();
  const primary = links.filter((link) => !link.group);
  const administration = links.filter((link) => link.group === "administration");
  const administrationActive = administration.some((link) => isActive(pathname, link.href));

  if (mobile) {
    return (
      <>
        {primary.map((link) => <NavItem key={link.href} link={link} pathname={pathname} />)}
        {administration.length ? <p className="col-span-full mt-1 px-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-violet-200/80">Administración</p> : null}
        {administration.map((link) => <NavItem key={link.href} link={link} pathname={pathname} />)}
      </>
    );
  }

  return (
    <>
      {primary.map((link) => <NavItem key={link.href} link={link} pathname={pathname} />)}
      {administration.length ? (
        <details className="admin-nav relative">
          <summary aria-current={administrationActive ? "page" : undefined}>Administración <span aria-hidden="true">▾</span></summary>
          <div className="absolute right-0 top-[calc(100%+.55rem)] min-w-44 rounded-xl border border-white/15 bg-[#21103f] p-2 shadow-2xl">
            {administration.map((link) => <NavItem key={link.href} link={link} pathname={pathname} />)}
          </div>
        </details>
      ) : null}
    </>
  );
}

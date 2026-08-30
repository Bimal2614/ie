"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Headphones,
  BookOpen,
  PenLine,
  Mic,
  Target,
  Trophy,
  Sparkles,
  GraduationCap,
  Newspaper,
  ChevronDown,
  PanelLeftClose,
  CreditCard,
  HelpCircle,
  History,
  Library,
  Mail,
  BadgeCheck,
} from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

type NavChild = { href: string; label: string; icon?: React.ComponentType<{ className?: string }> };
type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavChild[];
  badge?: string;
  exact?: boolean;
};
type Group = { label: string; items: NavItem[] };

const GROUPS: Group[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/history", label: "History", icon: History },
    ],
  },
  {
    label: "Practice",
    items: [
      {
        href: "/practice",
        label: "Practice",
        icon: Target,
        exact: true,
        children: [
          { href: "/practice/listening", label: "Listening", icon: Headphones },
          { href: "/practice/reading", label: "Reading", icon: BookOpen },
          { href: "/practice/writing", label: "Writing", icon: PenLine },
          { href: "/practice/speaking", label: "Speaking", icon: Mic },
        ],
      },
      {
        // A second way in, by SOURCE rather than task type: a whole exam part
        // as the book prints it. Its own area, so the flow has an address and
        // the player's way out is a route rather than an anchor.
        href: "/section-practice",
        label: "Section-wise",
        icon: Library,
      },
    ],
  },
  {
    label: "Tests",
    items: [
      { href: "/mock-tests", label: "Mock Tests", icon: Trophy, badge: "Premium" },
      { href: "/results", label: "Results", icon: Sparkles },
    ],
  },
  {
    label: "Learn",
    items: [
      { href: "/resources", label: "Study Materials", icon: GraduationCap },
      { href: "/blog", label: "Blog", icon: Newspaper },
    ],
  },
];

/**
 * Appended only for admins. Not a security boundary — /verify-students calls
 * `requireAdmin()` itself; this is just how an admin finds the screen.
 */
const ADMIN_GROUP: Group = {
  label: "Admin",
  items: [{ href: "/verify-students", label: "Verify Students", icon: BadgeCheck }],
};

/**
 * The nav's own `pb-10`, in px. It keeps the last item clear of the "More"
 * pill, so it must not count as scrollable content when deciding whether the
 * list actually runs past the fold.
 */
const NAV_BOTTOM_PAD = 40;

interface SidebarProps {
  onNavigate?: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
  isAdmin?: boolean;
}

export function Sidebar({ onNavigate, showCloseButton, onClose, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const groups = isAdmin ? [...GROUPS, ADMIN_GROUP] : GROUPS;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const navRef = useRef<HTMLElement>(null);
  // The shell hides its scrollbars, so on a short viewport the tail of the nav
  // ("Study Materials", "Blog") sits below the fold with nothing to say so.
  // Track which edge still has content behind it and fade / nudge that edge.
  const [overflow, setOverflow] = useState({ top: false, bottom: false });

  const syncOverflow = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setOverflow({
      top: el.scrollTop > 4,
      bottom: max > NAV_BOTTOM_PAD && el.scrollTop < max - 4,
    });
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    syncOverflow();
    // A viewport resize changes what fits; expanding a group and changing route
    // change what there is to fit, hence those deps.
    const observer = new ResizeObserver(syncOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncOverflow, expanded, pathname]);

  const scrollToMore = () => {
    const el = navRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="sidebar-shell w-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 text-white" onClick={onNavigate}>
          <LogoMark className="h-9 w-9" priority />
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              IELTSVega
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Academic &amp; General
            </span>
          </span>
        </Link>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <nav ref={navRef} onScroll={syncOverflow} className="h-full overflow-y-auto px-3 pb-10">
          {groups.map((group) => (
            <div key={group.label} className="mt-4 first:mt-2">
              <p className="sidebar-group-label">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const parentActive = isActive(item.href, item.exact);
                  const childActive = item.children?.some((c) => isActive(c.href)) ?? false;
                  // Always collapsed until the user opens it — being on a child
                  // route highlights the parent instead of expanding it, so the
                  // list keeps the same height wherever you are.
                  const isOpen = expanded[item.href] ?? false;
                  return (
                    <li key={item.href}>
                      {item.children ? (
                        <div className="sidebar-item gap-0 pr-1" data-active={parentActive || childActive}>
                          <Link href={item.href} className="flex min-w-0 flex-1 items-center gap-3" onClick={onNavigate}>
                            <item.icon className="h-4 w-4 shrink-0 opacity-80" />
                            <span className="flex-1 truncate">{item.label}</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setExpanded((p) => ({ ...p, [item.href]: !isOpen }))}
                            aria-expanded={isOpen}
                            aria-label={`${isOpen ? "Collapse" : "Expand"} ${item.label}`}
                            className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white"
                          >
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                          </button>
                        </div>
                      ) : (
                        <Link href={item.href} className="sidebar-item" data-active={parentActive} onClick={onNavigate}>
                          <item.icon className="h-4 w-4 shrink-0 opacity-80" />
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )}

                      {item.children && isOpen && (
                        <ul className="ml-4 space-y-0.5 border-l border-white/10 pl-2">
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <Link href={child.href} className="sidebar-item" data-active={isActive(child.href)} onClick={onNavigate}>
                                {child.icon && <child.icon className="h-4 w-4 shrink-0 opacity-80" />}
                                <span className="flex-1 truncate">{child.label}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div aria-hidden className="sidebar-fade sidebar-fade-top" data-visible={overflow.top} />
        <div aria-hidden className="sidebar-fade sidebar-fade-bottom" data-visible={overflow.bottom} />
        <button
          type="button"
          onClick={scrollToMore}
          className="sidebar-more"
          data-visible={overflow.bottom}
          tabIndex={overflow.bottom ? 0 : -1}
          aria-hidden={!overflow.bottom}
          aria-label="Scroll down for more navigation"
        >
          <span>More</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-0.5 border-t border-white/5 px-3 py-3">
        <Link href="/pricing" className="sidebar-item" data-active={isActive("/pricing")} onClick={onNavigate}>
          <CreditCard className="h-4 w-4 opacity-80" />
          <span>Pricing</span>
        </Link>
        <Link href="/settings" className="sidebar-item" data-active={isActive("/settings")} onClick={onNavigate}>
          <HelpCircle className="h-4 w-4 opacity-80" />
          <span>Settings &amp; help</span>
        </Link>
        <Link href="/contact" className="sidebar-item" data-active={isActive("/contact")} onClick={onNavigate}>
          <Mail className="h-4 w-4 opacity-80" />
          <span>Contact Us</span>
        </Link>
      </div>
    </aside>
  );
}

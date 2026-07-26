import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  Menu,
  MessageCircle,
  ReceiptText,
  Search,
  ShoppingBag,
  Shield,
  User,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import DisplayWallet from "./DisplayWallet";
import { ThemeToggle } from "./ThemeToggle";
import { CurrencyToggle } from "./CurrencyToggle";
import { NotificationCenter } from "./NotificationCenter";
import { useCart } from "@/providers/CartProvider";
import { Cart, CartIcon } from "./Cart";
import { Checkout } from "./Checkout";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/browse", label: "Browse", icon: Search },
  { to: "/sell", label: "Sell", icon: ShoppingBag },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/history", label: "History", icon: ReceiptText },
  { to: "/status", label: "Status", icon: Activity },
  { to: "/moderation", label: "Moderation", icon: Shield },
];

const mobileNavItems = [
  { to: "/browse", label: "Browse", icon: Search },
  { to: "/sell", label: "Sell", icon: ShoppingBag },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
];

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  [
    "flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors",
    isActive
      ? "bg-white/10 text-white"
      : "text-slate-300 hover:bg-white/5 hover:text-white",
  ].join(" ");

const mobileLinkClasses = ({ isActive }: { isActive: boolean }) =>
  [
    "flex flex-col items-center gap-1 py-2 px-3 rounded-xl text-[10px] font-medium transition-colors min-w-[60px]",
    isActive
      ? "text-emerald-400 bg-emerald-400/10"
      : "text-slate-400 active:text-white active:bg-white/10",
  ].join(" ");

export function Navigation() {
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const { itemCount } = useCart();
  const location = useLocation();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/images/logo.png"
                alt="PromptHash"
                width={36}
                height={36}
                className="rounded-full border border-white/10 bg-white/5 p-1"
              />
              <div>
                <div className="text-sm uppercase tracking-[0.28em] text-amber-300">
                  PromptHash
                </div>
                <div className="text-xs text-slate-400">
                  Stellar testnet marketplace
                </div>
              </div>
            </Link>
            <nav className="hidden items-center gap-2 md:flex">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={linkClasses}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="hidden sm:flex items-center gap-2 md:gap-4">
            <CurrencyToggle />
            <Button
              variant="ghost"
              size="icon"
              className="relative border border-white/10 text-white hover:bg-white/10"
              onClick={() => setShowCart(true)}
            >
              <CartIcon />
            </Button>
            <NotificationCenter />
            <ThemeToggle />
            <DisplayWallet />
          </div>

          <div className="flex sm:hidden items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="relative border border-white/10 text-white hover:bg-white/10 h-10 w-10"
              onClick={() => setShowCart(true)}
            >
              <CartIcon />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Button>
            <DisplayWallet />
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="border border-white/10 text-white hover:bg-white/10 h-10 w-10"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="border-white/10 bg-slate-950 text-white">
                <div className="mt-8 space-y-2">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-white/10 text-white"
                            : "text-slate-300 hover:bg-white/5 hover:text-white active:bg-white/10",
                        )
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </NavLink>
                  ))}
                  <div className="flex items-center gap-2 border-t border-white/10 pt-4 mt-4">
                    <CurrencyToggle />
                    <ThemeToggle />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Cart Drawer */}
        <Sheet open={showCart} onOpenChange={setShowCart}>
          <SheetContent className="border-white/10 bg-slate-950 text-white w-[400px] max-w-[90vw]">
            {showCheckout ? (
              <Checkout onClose={() => { setShowCheckout(false); setShowCart(false); }} />
            ) : (
              <div className="p-5">
                <Cart onCheckout={() => setShowCheckout(true)} />
              </div>
            )}
          </SheetContent>
        </Sheet>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 sm:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-lg safe-area-inset">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={mobileLinkClasses}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setShowCart(true)}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-3 rounded-xl text-[10px] font-medium transition-colors min-w-[60px]",
              "text-slate-400 active:text-white active:bg-white/10 relative",
            )}
          >
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </div>
            <span>Cart</span>
          </button>
        </div>
      </nav>
    </>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Eye, EyeOff, AlertCircle, User, Lock, Users, UserCheck, CalendarClock } from "lucide-react";
import { useTheme } from "../lib/theme";

export default function Login() {
  const [dark] = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await api.login(username, password);
      localStorage.setItem("hr_token", token);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex bg-background">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-primary text-primary-foreground flex-col justify-between p-12">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, white, transparent 70%)" }}
        />

        <div className="relative">
          <img src="/images/intellify_logo_white.svg" alt="IntellifyAi" className="h-8 w-auto" />
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            One workspace for hiring, people and payroll.
          </h1>
          <p className="text-primary-foreground/80 text-base max-w-md">
            Pipelines, attendance, reviews and AI-assisted hiring — all in one place for your HR team.
          </p>
          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2 text-sm text-primary-foreground/90">
              <UserCheck className="h-4 w-4" />Hiring pipeline
            </div>
            <div className="flex items-center gap-2 text-sm text-primary-foreground/90">
              <Users className="h-4 w-4" />Employees
            </div>
            <div className="flex items-center gap-2 text-sm text-primary-foreground/90">
              <CalendarClock className="h-4 w-4" />Attendance
            </div>
          </div>
        </div>

        <div className="relative text-xs text-primary-foreground/60">
          &copy; {new Date().getFullYear()} IntellifyAi
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex justify-center lg:hidden">
            <img
              src={dark ? "/images/intellify_logo_white.svg" : "/images/intellify_logo_night.svg"}
              alt="IntellifyAi"
              className="h-9 w-auto"
            />
          </div>

          <div className="hidden lg:block space-y-1">
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your HR workspace</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="pl-9 h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-9 pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Internal HR workspace &middot; access restricted to authorized staff
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setMessage("");
        setLoading(true);

        try {
            const supabase = createClient();

            const { error: loginError } =
                await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                });

            if (loginError) {
                setError("Unable to sign in. Check your credentials and try again.");
                return;
            }

            setMessage("Sign-in successful. Redirecting...");
            window.location.assign("/");
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10 text-zinc-900">
            <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl shadow-gray-900/5">
                <div className="mb-8">
                    <p className="text-sm font-bold tracking-[0.2em] text-[#9F1239]">
                        FREEBEES
                    </p>

                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                        Welcome back
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Sign in to your sales CRM account.
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Work email
                        </label>

                        <input
                            id="email"
                            type="email"
                            autoComplete="username"
                            required
                            maxLength={254}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@company.com"
                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#9F1239] focus:ring-2 focus:ring-[#9F1239]/15"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Password
                        </label>

                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            maxLength={128}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Enter your password"
                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#9F1239] focus:ring-2 focus:ring-[#9F1239]/15"
                        />
                    </div>

                    {error && (
                        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </p>
                    )}

                    {message && (
                        <p role="status" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-[#881337]">
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-rose-500 px-4 py-3 font-semibold text-white transition hover:bg-[#881337] focus:outline-none focus:ring-2 focus:ring-[#9F1239] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <p className="mt-6 text-xs leading-5 text-slate-500">
                    Access is intended for authorized FreeBees team members.
                    Account access is also enforced by the server and database.
                </p>
            </section>
        </main>
    );
}

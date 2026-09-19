export function SignOutButton({ redirectTo }: { redirectTo?: string }) {
  const action = redirectTo ? `/auth/sign-out?next=${encodeURIComponent(redirectTo)}` : "/auth/sign-out";

  return (
    <form action={action} method="post">
      <button className="nav-sign-out" type="submit">
        Sign out
      </button>
    </form>
  );
}

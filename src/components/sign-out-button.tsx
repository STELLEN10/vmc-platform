export function SignOutButton() {
  return (
    <form action="/auth/sign-out" method="post">
      <button className="nav-sign-out" type="submit">
        Sign out
      </button>
    </form>
  );
}

import { AuthPage, type AuthMode } from "./AuthPage";

type AuthPageRouteProps = {
  searchParams?: {
    mode?: string;
  };
};

const VALID_MODES: AuthMode[] = ["login", "register", "forgot"];

export default function Page({ searchParams }: AuthPageRouteProps) {
  const mode = VALID_MODES.includes(searchParams?.mode as AuthMode)
    ? (searchParams?.mode as AuthMode)
    : "login";

  return <AuthPage initialMode={mode} />;
}

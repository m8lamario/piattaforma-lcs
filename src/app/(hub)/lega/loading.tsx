import { Skeleton } from "@/shared/ui/Skeleton";

export default function LeagueLoading() {
  return (
    <main>
      <Skeleton variant="title" width="40%" />
      <Skeleton variant="block" height="8rem" />
      <Skeleton variant="block" height="12rem" />
    </main>
  );
}

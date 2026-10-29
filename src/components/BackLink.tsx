// Every view's link back to Home — programmatic in-app navigation (the empty hash
// route), not a real fragment target, hence the single disable: an actual anchor
// still works better here than a button (browser back/forward, open-in-new-tab,
// hover preview all keep working). The padding (offset by the margins) makes it a
// comfortable tap target on phones without moving anything.
export function BackLink({ className = '-mt-2 mb-2 inline-block py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:underline' }: { className?: string }) {
  // eslint-disable-next-line jsx-a11y/anchor-is-valid -- home is the empty hash route, this is real in-app navigation
  return <a href="#" className={className}>All rounds</a>;
}

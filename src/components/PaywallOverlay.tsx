import { Icon } from "./Icon";

export function PaywallOverlay({
  pricePaise,
  onUnlock,
}: {
  pricePaise: number;
  onUnlock: () => void;
}) {
  const price = `$${(pricePaise / 100).toFixed(0)}`;
  return (
    <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-12 text-center card-gradient">
      <div className="w-16 h-16 mx-auto rounded-full bg-surface-container-highest flex items-center justify-center mb-6">
        <Icon name="lock" className="text-primary text-3xl" />
      </div>
      <h3 className="font-headline text-2xl text-primary mb-2">
        Locked role
      </h3>
      <p className="text-on-surface-variant mb-8 max-w-md mx-auto">
        The company, location, full description and apply link are hidden until
        you unlock this role or activate a subscription.
      </p>
      <button
        type="button"
        onClick={onUnlock}
        className="bg-primary text-on-primary font-headline font-semibold px-8 py-4 rounded-md hover:bg-primary-container transition-colors duration-300 inline-flex items-center gap-2"
      >
        <Icon name="lock_open" />
        Unlock from {price}
      </button>
    </div>
  );
}

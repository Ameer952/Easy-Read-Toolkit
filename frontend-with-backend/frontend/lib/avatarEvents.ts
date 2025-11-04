type AvatarListener = (uri: string | null) => void;

const listeners = new Set<AvatarListener>();

export function subscribeAvatar(listener: AvatarListener) {
   listeners.add(listener);
   return () => {
      listeners.delete(listener);
   };
}

export function notifyAvatar(uri: string | null) {
   listeners.forEach((l) => l(uri));
}

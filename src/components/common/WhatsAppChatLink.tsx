'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  buildWhatsAppMeUrl,
  markWebsiteWhatsAppOpened,
  resolveWebsiteWhatsAppMessage,
} from '@/lib/whatsapp/website-chat';

interface WhatsAppChatLinkProps {
  phone: string;
  firstMessage?: string | null;
  className?: string;
  title?: string;
  children: ReactNode;
}

export default function WhatsAppChatLink({
  phone,
  firstMessage,
  className,
  title,
  children,
}: WhatsAppChatLinkProps) {
  const [href, setHref] = useState(buildWhatsAppMeUrl(phone, firstMessage));

  useEffect(() => {
    setHref(buildWhatsAppMeUrl(phone, resolveWebsiteWhatsAppMessage(firstMessage || '')));
  }, [phone, firstMessage]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
      onClick={markWebsiteWhatsAppOpened}
    >
      {children}
    </a>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Clock,
  BookmarkCheck,
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import toast from 'react-hot-toast';

const legacyNotificationTitles = {
  'Book Borrowed': 'Emprunt confirmé',
  'Book Due Soon': 'Rappel de retour',
  'Book Overdue': 'Retard de retour',
  'Book Returned': 'Retour confirmé',
  'Fine Applied': 'Pénalité appliquée',
};

const getNotificationText = (notification) => {
  const { type, title, message } = notification;
  const translatedTitle = legacyNotificationTitles[title];
  if (!translatedTitle) return { title, message };

  const bookTitle = message.match(/"([^"]+)"/)?.[1] || 'votre livre';
  const dueDate = message.match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0];
  const amount = message.match(/(?:fine of |Current fine: )([\d.]+) DT/i)?.[1];
  const daysLate = message.match(/(\d+) day\(s\) overdue/i)?.[1];

  switch (type) {
    case 'borrow_confirmation':
      return {
        title: translatedTitle,
        message: `Vous avez emprunté « ${bookTitle} ». La date de retour est le ${dueDate || 'à confirmer'}.`,
      };
    case 'due_reminder':
      return {
        title: translatedTitle,
        message: `L’emprunt de « ${bookTitle} » arrive à échéance le ${dueDate || 'bientôt'}. Pensez à le retourner à temps pour éviter une pénalité.`,
      };
    case 'overdue':
      return {
        title: translatedTitle,
        message: `L’emprunt de « ${bookTitle} » devait être rendu le ${dueDate || 'à confirmer'} et a ${daysLate || 'plusieurs'} jour(s) de retard.${amount ? ` Pénalité actuelle : ${amount} DT.` : ''} Merci de le rapporter dès que possible.`,
      };
    case 'return_confirmation':
      return {
        title: translatedTitle,
        message: `Vous avez rendu « ${bookTitle} » le ${dueDate || 'récemment'}.${amount ? ` Une pénalité de ${amount} DT a été appliquée pour le retard.` : ''}`,
      };
    case 'fine_notice':
      return {
        title: translatedTitle,
        message: `Une pénalité${amount ? ` de ${amount} DT` : ''} a été appliquée à l’emprunt de « ${bookTitle} ». Veuillez la régler à la bibliothèque.`,
      };
    default:
      return { title, message };
  }
};

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10, unreadOnly: unreadOnly ? 'true' : 'false' };
      const res = await notificationService.getNotifications(params);
      setNotifications(res.data || []);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, unreadOnly]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      fetchNotifications();
    } catch (err) {
      toast.error('Impossible de marquer cette notification comme lue.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      toast.success('Toutes les notifications sont marquées comme lues.');
      fetchNotifications();
    } catch (err) {
      toast.error('Erreur lors de l\'opération.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      fetchNotifications();
    } catch (err) {
      toast.error('Erreur lors de la suppression.');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case 'due_reminder':
        return <Clock className="w-5 h-5 text-amber-400" />;
      case 'borrow_confirmation':
        return <BookmarkCheck className="w-5 h-5 text-emerald-400" />;
      case 'return_confirmation':
        return <BookmarkCheck className="w-5 h-5 text-emerald-400" />;
      case 'fine_notice':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#18312f] tracking-tight">
            Centre de Notifications
          </h1>
          <p className="text-xs sm:text-sm text-[#657a73] mt-1">
            Rappels d'échéances de prêt, confirmations de retour et avis du service
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition self-start sm:self-auto"
        >
          <CheckCheck className="w-4 h-4 text-emerald-400" />
          <span>Tout marquer comme lu</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => {
            setUnreadOnly(false);
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            !unreadOnly
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Toutes
        </button>
        <button
          onClick={() => {
            setUnreadOnly(true);
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            unreadOnly
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Non lues uniquement
        </button>
      </div>

      {/* Notification List */}
      {loading ? (
        <LoadingSpinner size="lg" text="Chargement de vos notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Aucune notification"
          description="Votre boîte de réception est à jour ! Vous recevrez des alertes avant chaque date d'échéance."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const content = getNotificationText(notif);
            return (
              <div
                key={notif._id}
                className={`glass-card p-4 rounded-2xl border transition flex items-start justify-between gap-4 ${
                  !notif.isRead
                    ? 'border-indigo-500/40 bg-indigo-950/20'
                    : 'border-slate-800/80 bg-slate-900/40'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-white">{content.title}</h4>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{content.message}</p>
                    <p className="text-[10px] text-slate-500 mt-2">
                      {new Date(notif.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {!notif.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notif._id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                      title="Marquer comme lu"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif._id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
};

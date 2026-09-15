import { MessageSquarePlus, Trash2 } from "lucide-react";
import { useState } from "react";

export default function Sidebar({ conversations, selectedId, onCreate, onDelete, onSelect }) {
  const [deleteTarget, setDeleteTarget] = useState(null);

  function requestDelete(event, conversation) {
    event.stopPropagation();
    setDeleteTarget(conversation);
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }
    const target = deleteTarget;
    setDeleteTarget(null);
    await onDelete(target.id);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div>
          <p className="eyebrow">Server store</p>
          <h2>Conversations</h2>
        </div>
        <button className="icon-button primary" type="button" onClick={onCreate} title="Tạo conversation">
          <MessageSquarePlus size={18} />
        </button>
      </div>

      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="empty-sidebar">Chưa có conversation</div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={
                conversation.id === selectedId ? "conversation-row selected" : "conversation-row"
              }
            >
              <button
                className="conversation-select"
                type="button"
                onClick={() => onSelect(conversation.id)}
                title={conversation.title}
              >
                {conversation.title}
              </button>
              <button
                className="icon-button ghost"
                type="button"
                onClick={(event) => requestDelete(event, conversation)}
                title="Xóa conversation"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {deleteTarget ? (
        <div className="dialog-backdrop" role="presentation" onClick={() => setDeleteTarget(null)}>
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog-icon">
              <Trash2 size={22} />
            </div>
            <div className="dialog-copy">
              <h3 id="delete-dialog-title">Xóa conversation?</h3>
              <p>{deleteTarget.title}</p>
            </div>
            <div className="dialog-actions">
              <button className="dialog-button secondary" type="button" onClick={() => setDeleteTarget(null)}>
                Hủy
              </button>
              <button className="dialog-button danger" type="button" onClick={confirmDelete}>
                Xóa
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

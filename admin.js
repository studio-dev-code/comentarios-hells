import { createBackend } from "./supabase-client.js";
import { MANAGER_EMAILS } from "./supabase-config.js";

const loginForm = document.querySelector("#login-form");
const adminMessage = document.querySelector("#admin-message");
const moderationPanel = document.querySelector("#moderation-panel");
const queueMessage = document.querySelector("#queue-message");
const pendingList = document.querySelector("#pending-list");
const logoutButton = document.querySelector("#logout-button");

let backend;

try {
    backend = createBackend();
} catch (error) {
    loginForm.querySelector("button[type='submit']").disabled = true;
    adminMessage.textContent = error.message;
}

function isManager(user) {
    return user?.app_metadata?.role === "admin";
}

function renderPendingComment(comment) {
    const card = document.createElement("article");
    card.className = "comment-card";

    const name = document.createElement("h3");
    name.textContent = comment.name;
    card.append(name);

    const rating = document.createElement("p");
    rating.className = "comment-rating";
    rating.textContent = `${"★".repeat(comment.rating)}${"☆".repeat(5 - comment.rating)}`;
    card.append(rating);

    const content = document.createElement("p");
    content.className = "comment-content";
    content.textContent = comment.content;
    card.append(content);

    const actions = document.createElement("div");
    actions.className = "comment-actions";
    actions.innerHTML = `
        <button type="button" data-action="publish" data-id="${comment.id}">Publicar</button>
        <button type="button" class="delete-button" data-action="delete" data-id="${comment.id}">Excluir</button>
    `;
    card.append(actions);

    return card;
}

async function loadPendingComments() {
    queueMessage.textContent = "Carregando comentários pendentes...";

    const { data, error } = await backend
        .from("comments")
        .select("id, name, rating, content, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

    if (error) {
        throw error;
    }

    pendingList.replaceChildren();

    if (data.length === 0) {
        queueMessage.textContent = "Não há comentários aguardando revisão.";
        return;
    }

    queueMessage.textContent = `${data.length} comentário(s) aguardando revisão.`;
    data.forEach((comment) => pendingList.append(renderPendingComment(comment)));
}

async function openModeration(user) {
    if (!isManager(user)) {
        await backend.auth.signOut();
        moderationPanel.hidden = true;
        adminMessage.textContent = "Esta conta não tem permissão de administração.";
        return;
    }

    adminMessage.textContent = `Conectado como ${user.email}.`;
    moderationPanel.hidden = false;

    try {
        await loadPendingComments();
    } catch (error) {
        queueMessage.textContent = `Não foi possível carregar a fila: ${error.message}`;
    }
}

if (backend) {
    adminMessage.textContent = "Entre com uma conta autorizada da gerência.";

    backend.auth.getSession().then(({ data, error }) => {
        if (error) {
            adminMessage.textContent = `Não foi possível verificar a sessão: ${error.message}`;
            return;
        }

        if (data.session) {
            openModeration(data.session.user).catch((sessionError) => {
                adminMessage.textContent = `Não foi possível validar o acesso: ${sessionError.message}`;
            });
        }
    }).catch((error) => {
        adminMessage.textContent = `Não foi possível verificar a sessão: ${error.message}`;
    });

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = loginForm.querySelector("button[type='submit']");
        button.disabled = true;
        adminMessage.textContent = "Verificando acesso...";

        try {
            const formData = new FormData(loginForm);
            const username = formData.get("username").trim().toLowerCase();
            const email = MANAGER_EMAILS[username];

            if (!email) {
                throw new Error(`O usuário "${username}" ainda não foi configurado para entrar.`);
            }

            const { data, error } = await backend.auth.signInWithPassword({
                email,
                password: formData.get("password"),
            });

            if (error) {
                throw error;
            }

            await openModeration(data.user);
        } catch (error) {
            adminMessage.textContent = `Não foi possível entrar: ${error.message}`;
        } finally {
            button.disabled = false;
        }
    });

    logoutButton.addEventListener("click", async () => {
        const { error } = await backend.auth.signOut();

        if (error) {
            adminMessage.textContent = `Não foi possível sair: ${error.message}`;
            return;
        }

        moderationPanel.hidden = true;
        adminMessage.textContent = "Você saiu da área administrativa.";
    });

    pendingList.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-action]");

        if (!button) {
            return;
        }

        const { action, id } = button.dataset;

        if (action === "delete" && !window.confirm("Excluir este comentário permanentemente?")) {
            return;
        }

        button.disabled = true;

        try {
            const result = action === "publish"
                ? await backend.from("comments").update({ status: "approved" }).eq("id", id)
                : await backend.from("comments").delete().eq("id", id);

            if (result.error) {
                throw result.error;
            }

            await loadPendingComments();
        } catch (error) {
            queueMessage.textContent = `Não foi possível ${action === "publish" ? "publicar" : "excluir"}: ${error.message}`;
            button.disabled = false;
        }
    });
}

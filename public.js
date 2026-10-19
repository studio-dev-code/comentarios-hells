import { createBackend } from "./supabase-client.js";

const form = document.querySelector("#comment-form");
const formMessage = document.querySelector("#form-message");
const commentsList = document.querySelector("#comments-list");
const commentsMessage = document.querySelector("#comments-message");

let backend;

try {
    backend = createBackend();
} catch (error) {
    form.querySelector("button[type='submit']").disabled = true;
    formMessage.textContent = error.message;
    commentsMessage.textContent = "As avaliações aparecerão aqui quando o Supabase estiver conectado.";
}

function renderComment(comment) {
    const card = document.createElement("article");
    card.className = "comment-card";

    const name = document.createElement("h3");
    name.textContent = comment.name;
    card.append(name);

    const rating = document.createElement("p");
    rating.className = "comment-rating";
    rating.setAttribute("aria-label", `Nota: ${comment.rating} de 5 estrelas`);
    rating.textContent = `${"★".repeat(comment.rating)}${"☆".repeat(5 - comment.rating)}`;
    card.append(rating);

    const content = document.createElement("p");
    content.className = "comment-content";
    content.textContent = comment.content;
    card.append(content);

    const date = document.createElement("p");
    date.className = "comment-date";
    date.textContent = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
        new Date(comment.created_at)
    );
    card.append(date);

    return card;
}

async function loadComments() {
    const { data, error } = await backend
        .from("comments")
        .select("id, name, rating, content, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

    if (error) {
        throw error;
    }

    commentsList.replaceChildren();

    if (data.length === 0) {
        commentsMessage.textContent = "Ainda não há avaliações publicadas.";
        return;
    }

    commentsMessage.textContent = "";
    data.forEach((comment) => commentsList.append(renderComment(comment)));
}

if (backend) {
    loadComments().catch((error) => {
        commentsMessage.textContent = `Não foi possível carregar as avaliações: ${error.message}`;
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = form.querySelector("button[type='submit']");
        button.disabled = true;
        formMessage.textContent = "Enviando comentário...";

        try {
            const formData = new FormData(form);
            const { error } = await backend.from("comments").insert({
                name: formData.get("nome").trim(),
                rating: Number(formData.get("nota")),
                content: formData.get("comentario").trim(),
            });

            if (error) {
                throw error;
            }

            form.reset();
            formMessage.textContent = "Recebemos seu comentário. Ele poderá aparecer no site em alguns minutos.";
        } catch (error) {
            formMessage.textContent = `Não foi possível enviar a avaliação: ${error.message}`;
        } finally {
            button.disabled = false;
        }
    });
}

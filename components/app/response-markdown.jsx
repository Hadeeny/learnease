import React, { useState } from "react";
import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import CopyToClipboardButton from "./copy-to-clipboard";
import ResponseMenu from "./response-menu";
import ToastNotification from "../shared/alert";

export default function ResponseMarkdown({
  markdown,
  title,
  handleSubmit,
  loading,
  focusMode,
  setFocusMode,
  currentlyLoggedInUser,
  fetchSavedPromptResponses,
  savedPromptResponse,
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDeletingResponse, setIsDeletingResponse] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const saveResponse = async () => {
    setSaving(true);
    const payload = {
      userId: currentlyLoggedInUser?.userId,
      title,
      markdown,
    };

    const res = await fetch("/api/response", {
      method: "POST",
      header: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const { data } = await res.json();
      console.log(data);
      fetchSavedPromptResponses();
      setSaved(true);
      // setSaving(false);
      setTimeout(() => {
        window.location.href = "/dashboard/" + data?.responseId;
      }, [2000]);
    }
  };

  const deleteResponse = async (responseId) => {
    setIsDeletingResponse(true);

    const confirm = window.confirm(
      `
      Warning! ✋🏽
      
      Are you sure you want to delete this prompt response?
      `
    );

    if (!confirm) {
      setIsDeletingResponse(false);
      return;
    }

    if (!responseId) {
      return;
    }

    const res = await fetch("/api/response/" + responseId, {
      method: "DELETE",
    });
    const data = await res.json();

    if (data?.success) {
      setDeleted(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    }
  };
  return (
    <div className={`markdown-container ${loading && "min-h-[100vh]"}`}>
      {saved ? (
        <ToastNotification
          open={saved}
          setOpen={setSaved}
          title='Prompt response saved to dashboard'
          dark
        />
      ) : null}

      {setDeleted ? (
        <ToastNotification
          open={deleted}
          setOpen={setDeleted}
          title='Prompt response deleted successfully'
          dark
        />
      ) : null}
      <ResponseMenu
        currentlyLoggedInUser={currentlyLoggedInUser}
        reload={handleSubmit}
        isLoading={loading}
        focusMode={focusMode}
        setFocusMode={setFocusMode}
        saveResponse={saveResponse}
        saving={saving}
        deleteResponse={deleteResponse}
        isDeletingResponse={isDeletingResponse}
        savedPromptResponse={savedPromptResponse}
      />

      <h1 className='capitalize'>{title}</h1>

      <ReactMarkdown
        linkTarget={"_blank"}
        remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
        components={{
          pre: PreWithCopyToClipboard,
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const formatedChildren = String(children).replace(/\n$/, "");
            return !inline && match ? (
              <>
                <SyntaxHighlighter
                  language={match[1]}
                  PreTag='div'
                  {...props}
                  wrapLines
                  wrapLongLines
                >
                  {/* passed here because of react/no-children-prop error */}
                  {formatedChildren}
                </SyntaxHighlighter>
              </>
            ) : (
              <code
                className={`overflow-x-scroll ${className}`}
                {...props}
                style={{ borderRadius: "100%" }}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {/* passed here because of react/no-children-prop error */}
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

const PreWithCopyToClipboard = ({ children }) => {
  return (
    <pre style={{ position: "relative" }}>
      <CopyToClipboardButton codeBlock={children[0].props.children[0]} />
      <div>{children}</div>
    </pre>
  );
};

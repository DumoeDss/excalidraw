import { t } from "@excalidraw/excalidraw/i18n";
import {
  AppContent,
  AppContentBody,
  AppContentHeader,
  AppContentSection,
} from "@excalidraw/excalidraw/components/appContent/AppContent";
import * as Sentry from "@sentry/browser";
import React from "react";

interface TopErrorBoundaryState {
  hasError: boolean;
  sentryEventId: string;
  localStorage: string;
}

const RecoverySentence = ({
  copy,
  onAction,
}: {
  copy: string;
  onAction: () => void;
}) => {
  const startTag = "<button>";
  const endTag = "</button>";
  const start = copy.indexOf(startTag);
  const end = copy.indexOf(endTag, start + startTag.length);

  if (start === -1 || end === -1) {
    return copy;
  }

  return (
    <>
      {copy.slice(0, start)}
      <button onClick={onAction}>
        {copy.slice(start + startTag.length, end)}
      </button>
      {copy.slice(end + endTag.length)}
    </>
  );
};

export class TopErrorBoundary extends React.Component<
  any,
  TopErrorBoundaryState
> {
  state: TopErrorBoundaryState = {
    hasError: false,
    sentryEventId: "",
    localStorage: "",
  };

  render() {
    return this.state.hasError ? this.errorSplash() : this.props.children;
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const _localStorage: any = {};
    for (const [key, value] of Object.entries({ ...localStorage })) {
      try {
        _localStorage[key] = JSON.parse(value);
      } catch (error: any) {
        _localStorage[key] = value;
      }
    }

    Sentry.withScope((scope) => {
      scope.setExtras(errorInfo);
      const eventId = Sentry.captureException(error);

      this.setState((state) => ({
        hasError: true,
        sentryEventId: eventId,
        localStorage: JSON.stringify(_localStorage),
      }));
    });
  }

  private selectTextArea(event: React.MouseEvent<HTMLTextAreaElement>) {
    if (event.target !== document.activeElement) {
      event.preventDefault();
      (event.target as HTMLTextAreaElement).select();
    }
  }

  private async createGithubIssue() {
    let body = "";
    try {
      const templateStrFn = (
        await import(
          /* webpackChunkName: "bug-issue-template" */ "../bug-issue-template"
        )
      ).default;
      body = encodeURIComponent(templateStrFn(this.state.sentryEventId));
    } catch (error: any) {
      console.error(error);
    }

    window.open(
      `https://github.com/excalidraw/excalidraw/issues/new?body=${body}`,
      "_blank",
      "noopener noreferrer",
    );
  }

  private errorSplash() {
    return (
      <div className="ErrorSplash excalidraw">
        <div className="ErrorSplash-messageContainer">
          <AppContent
            as="main"
            density="comfortable"
            interaction="neutral"
            label={t("errorDialog.title")}
          >
            <AppContentSection>
              <AppContentHeader
                title={
                  <RecoverySentence
                    copy={t("errorSplash.headingMain")}
                    onAction={() => window.location.reload()}
                  />
                }
              />
              <AppContentBody>
                <div className="ErrorSplash-paragraph align-center">
                  <RecoverySentence
                    copy={t("errorSplash.clearCanvasMessage")}
                    onAction={() => {
                      try {
                        localStorage.clear();
                        window.location.reload();
                      } catch (error: any) {
                        console.error(error);
                      }
                    }}
                  />
                  <br />
                  <div className="smaller">
                    <span role="img" aria-label="warning">
                      ⚠️
                    </span>
                    {t("errorSplash.clearCanvasCaveat")}
                    <span role="img" aria-hidden="true">
                      ⚠️
                    </span>
                  </div>
                </div>
                <div>
                  <div className="ErrorSplash-paragraph">
                    {t("errorSplash.trackedToSentry", {
                      eventId: this.state.sentryEventId,
                    })}
                  </div>
                  <div className="ErrorSplash-paragraph">
                    <RecoverySentence
                      copy={t("errorSplash.openIssueMessage")}
                      onAction={() => this.createGithubIssue()}
                    />
                  </div>
                  <div className="ErrorSplash-paragraph">
                    <div className="ErrorSplash-details">
                      <label>{t("errorSplash.sceneContent")}</label>
                      <textarea
                        rows={5}
                        onPointerDown={this.selectTextArea}
                        readOnly={true}
                        value={this.state.localStorage}
                      />
                    </div>
                  </div>
                </div>
              </AppContentBody>
            </AppContentSection>
          </AppContent>
        </div>
      </div>
    );
  }
}

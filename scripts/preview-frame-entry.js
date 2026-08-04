// Glue code for the sandboxed preview iframe (public/preview-frame.html). Inlined verbatim into
// public/preview-frame-bundle.js by scripts/build-preview-frame.mjs, inside the same closure as
// the React/ReactDOM/Babel/LiquidJS/PolarisShim/PreviewRuntime/LiquidPreviewRuntime module
// bindings it references below. Plain ES2020, no JSX — this file is not run through Babel by the
// build script.

function FrameErrorBoundary(props) {
  React.Component.call(this, props);
  this.state = { error: null };
}
FrameErrorBoundary.prototype = Object.create(React.Component.prototype);
FrameErrorBoundary.prototype.constructor = FrameErrorBoundary;
FrameErrorBoundary.getDerivedStateFromError = function (error) {
  return { error: error instanceof Error ? error.message : String(error) };
};
FrameErrorBoundary.prototype.componentDidCatch = function (error) {
  this.props.onError(error instanceof Error ? error.message : String(error));
};
FrameErrorBoundary.prototype.render = function () {
  if (this.state.error) return null;
  return this.props.children;
};

function postToHost(message) {
  window.parent.postMessage(Object.assign({ source: "preview-frame" }, message), "*");
}

var reactContainerEl = document.getElementById("root");
var liquidContainerEl = document.getElementById("liquid-root");
var root = ReactDOMClient.createRoot(reactContainerEl);
var LiquidEngine = LiquidPreviewRuntime.createShopifyLiquidEngine(LiquidJSNamespace.Liquid);

function showReactContainer() {
  reactContainerEl.style.display = "";
  liquidContainerEl.style.display = "none";
  liquidContainerEl.innerHTML = "";
}

function showLiquidContainer() {
  liquidContainerEl.style.display = "";
  reactContainerEl.style.display = "none";
  root.render(null);
}

function renderJsxEntry(files, entry, entryPath) {
  showReactContainer();
  var RouteComponent = PreviewRuntime.renderPreviewComponent(files, entry, {
    babel: Babel,
    polarisShim: PolarisShim,
  });
  root.render(
    React.createElement(
      FrameErrorBoundary,
      {
        key: entryPath,
        onError: function (message) {
          postToHost({ type: "error", error: message });
        },
      },
      React.createElement(RouteComponent),
    ),
  );
}

function renderLiquidEntry(files, entry) {
  showLiquidContainer();
  liquidContainerEl.innerHTML = LiquidPreviewRuntime.renderLiquidPreview(LiquidEngine, files, entry);
}

window.addEventListener("message", function (event) {
  var data = event.data;
  if (!data || data.source !== "preview-frame-host" || data.type !== "render") return;
  var files = data.files || [];
  var entry = null;
  for (var i = 0; i < files.length; i++) {
    if (files[i].path === data.entryPath) {
      entry = files[i];
      break;
    }
  }
  if (!entry) return;

  try {
    if (entry.path.endsWith(".liquid")) {
      renderLiquidEntry(files, entry);
    } else {
      renderJsxEntry(files, entry, data.entryPath);
    }
  } catch (err) {
    postToHost({ type: "error", error: err instanceof Error ? err.message : String(err) });
  }
});

postToHost({ type: "ready" });

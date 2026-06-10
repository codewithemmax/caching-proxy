# Caching Proxy

A command-line caching proxy server built with Node.js. It proxies incoming HTTP requests to a designated origin server and caches the responses in memory for a short duration (1 minute) to improve performance and reduce load on the origin.

## Features

- **CLI Interface**: Easy to start with command-line arguments.
- **In-Memory Caching**: Caches responses based on the request URL.
- **Cache Hit/Miss Logging**: Outputs `[HIT]`, `[MISS]`, or `[EXPIRED]` to the console for easy monitoring.
- **Header Forwarding**: Forwards request headers to the origin and origin headers back to the client, while adding an `X-Cache` header (`HIT` or `MISS`) to the response.
- **Global Installation**: Can be installed globally and used as a standalone CLI tool.

## Prerequisites

- Node.js installed on your machine.

## Installation

### Local Usage

Clone the repository and run it locally:

```bash
git clone <your-repository-url>
cd caching-proxy
npm install
```

### Global Installation

To use the tool from anywhere on your system, you can install it globally:

```bash
npm install -g .
```

*Note: Make sure you are in the project's root directory when running this command.*

## Usage

If installed globally, you can use the `caching-proxy` command directly. Otherwise, you can run it via `npm start --` or `node index.js`.

### Starting the Proxy Server

To start the server, you must provide the `--port` on which the proxy will listen and the `--origin` URL to which requests will be forwarded.

```bash
caching-proxy --port <number> --origin <url>
```

**Example:**

Start a proxy server on port `3000` that forwards requests to `https://dummyjson.com`:

```bash
caching-proxy --port 3000 --origin https://dummyjson.com
```

Now, if you make a request to `http://localhost:3000/products`, the proxy will fetch it from `https://dummyjson.com/products`, cache the response, and return it. Subsequent requests within the next minute will be served directly from the cache.

### Clearing the Cache

You can execute the CLI tool with the `--clear-cache` flag. 

```bash
caching-proxy --clear-cache
```

*(Note: In the current implementation, this clears the cache of the immediate process. For a persistent, multi-process setup, an external cache like Redis would typically be required.)*

## Architecture

- Uses Node's built-in `http` and `https` modules.
- Implements a simple `Map` for the in-memory cache.
- TTL (Time-To-Live) for cache entries is hardcoded to 60 seconds.

## License

ISC

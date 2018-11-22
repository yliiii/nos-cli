# nos CLI

## About
nos CLI 实现了 NOS 查看和上传功能。 能方便快速的查看指定桶的文件列表。能够单上传文件和批量上传整个目录文件，并且不会破坏文件路径。可以通过配置文件配置环境变量路径前缀，实现文件的环境划分。

## Install
```sh
npm i nos-cli -g
```

## Usage
```sh
nos -h

Usage: nos [options]

-c and -b is required everytime

Options:
  -V, --version               output the version number
  -c, --config <config_path>  nos config path
  -b, --bucket <bucket_name>  nos bucket name
  -l, --list [path_pattern]>  show directory
  -u, --upload <file_path>    upload file
  -e, --env <env>             key `prefixPath` from config file
  -n, --normal                disable md5
  -h, --help                  output usage information
```

## Config File
```js
{
  "accessKey": "your accessKey",
  "accessSecret": "your accessSecret",
  "endpoint": "your endpoint",
  "pathPrefix" : {
    "qa": "myqa/test",
    "dev": "mydev/test"
  }
}
```

## Example
show root directory
```sh
nos -c [myConfiPath] -b [bucketName] -l
```

show directory by prefix
```sh
nos -c [myConfiPath] -b [bucketName] -l [prefix]
```

upload file
```sh
nos -c [myConfiPath] -b [bucketName] -u [filePath]
```

batch upload (and set env)
```sh
nos -c [myConfiPath] -b [bucketName] -u [dir] -e [prefixPathKey: qa|dev|...]
```
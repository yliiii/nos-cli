import commander from 'commander'
import { init } from './lib/cmd'

commander
  .version('0.0.1')
  .description('nos-cli');

commander
  // .command('init [preset_conf]')
  // .alias('i')
  .description('初始化配置文件')
  .option("-c, --config <config_path>", "nos配置文件的路径")
  .option("-b, --bucket <bucket_name>", "nos桶名")
  .option("-l, --list [path_pattern]>", "显示桶目录树")
  .option("-u, --upload <file_path>", "上传文件")
  .option("-e, --env <env>", "设定上传的环境变量，配合配置文件中的‘pathPrefix’使用")
  .action(init)
  .on('--help', function() {
    console.log('\n Waiting for you!!!');
  });


commander.parse(process.argv);

import commander from 'commander'
import { init } from './lib/cmd'

commander
  .version('0.0.1')
  .description('nos-cli');

commander
  // .command('init [preset_conf]')
  // .alias('i')
  .description('初始化配置文件')
  .option("-c, --config <config_path>", "配置文件路径")
  .option("-b, --bucket <bucket_name>", "桶名")
  .option("-l, --list [path_pattern]>", "显示桶目录树")
  .option("-u, --upload <file_path>", "上传文件")
  .option("-e, --env <env>", "环境变量")
  .action(init)
  .on('--help', function() {
    console.log('\n Waiting for you!!!');
  });


commander.parse(process.argv);
